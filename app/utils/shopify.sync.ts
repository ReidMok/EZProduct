/**
 * Shopify Product Sync Utility
 * Handles creating products in Shopify via GraphQL API
 */

import "@shopify/shopify-api/adapters/node";
import { Session, shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import type { GeneratedProduct, ProductVariant } from "./ai.generator";

interface ShopifyConfig {
  shop: string;
  accessToken: string;
  session: Session; // Pass the actual session from shopify.authenticate.admin()
}

/**
 * Initialize Shopify API client
 * IMPORTANT: Use the same configuration as shopify.server.ts
 */
function getShopifyClient() {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: process.env.SCOPES?.split(",") || ["write_products", "read_products"],
    hostName: process.env.SHOPIFY_APP_URL?.replace("https://", "").replace("http://", "") || "",
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
  });

  return shopify;
}

/**
 * Create product in Shopify
 */
export async function createShopifyProduct(
  product: GeneratedProduct,
  config: ShopifyConfig,
  imageUrls?: string[]
): Promise<{ productId: string; productHandle: string }> {
  const shopify = getShopifyClient();
  // IMPORTANT: Use the session passed from shopify.authenticate.admin()
  // This ensures we're using the correct session with proper authentication
  const session = config.session;

  // Build product input
  const productInput = buildProductInput(product, imageUrls);

  // GraphQL Mutation
  // IMPORTANT: Use productSet instead of productCreate
  // productSet supports creating products with variants (price, sku, etc.) in one call
  // productCreate only supports basic product info, not full variant details
  const mutation = `
    mutation productSet($input: ProductSetInput!) {
      productSet(input: $input) {
        product {
          id
          handle
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const client = new shopify.clients.Graphql({ session });
    
    // Log the input for debugging (remove sensitive data in production)
    console.log("[Shopify Sync] Product Input:", JSON.stringify(productInput, null, 2));
    console.log("[Shopify Sync] Mutation:", mutation);
    
    // IMPORTANT: Shopify GraphQL client.request() expects query and variables directly
    // NOT wrapped in a 'data' object
    const response = await client.request({
      query: mutation,
      variables: {
        input: productInput,
      },
    });

    const data = response.body as any;
    
    // Log full response for debugging (this will help us see what Shopify actually returns)
    console.log("[Shopify Sync] Full Response Body:", JSON.stringify(data, null, 2));
    console.log("[Shopify Sync] Response Type:", typeof data);
    console.log("[Shopify Sync] Has data?:", !!data.data);
    console.log("[Shopify Sync] Has errors?:", !!data.errors);

    // Check for GraphQL errors FIRST (these are syntax/validation errors)
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const errorMessages = data.errors.map((e: any) => {
        const msg = e.message || String(e);
        const path = e.path ? ` (path: ${JSON.stringify(e.path)})` : "";
        return `${msg}${path}`;
      }).join("; ");
      console.error("[Shopify Sync] GraphQL Errors:", JSON.stringify(data.errors, null, 2));
      throw new Error(`Shopify GraphQL errors: ${errorMessages}`);
    }

    // Check for GraphQL user errors (these are business logic errors)
    // productSet returns userErrors in the same structure
    if (data.data?.productSet?.userErrors?.length > 0) {
      const errors = data.data.productSet.userErrors;
      const errorMessages = errors.map((e: any) => {
        const field = e.field ? `[${e.field}] ` : "";
        return `${field}${e.message}`;
      }).join("; ");
      console.error("[Shopify Sync] User Errors:", JSON.stringify(errors, null, 2));
      throw new Error(`Shopify API user errors: ${errorMessages}`);
    }

    // Check if product was created
    if (!data.data?.productSet?.product) {
      console.error("[Shopify Sync] No product returned. Full response:", JSON.stringify(data, null, 2));
      throw new Error("Failed to create product: No product returned in response");
    }

    const createdProduct = data.data.productSet.product;

    return {
      productId: createdProduct.id,
      productHandle: createdProduct.handle,
    };
  } catch (error) {
    // Enhanced error logging for debugging
    console.error("[Shopify Sync] Error Details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    
    const errAny = error as any;
    
    // Try to extract more details from the error response
    let detailedError = "";
    
    if (errAny?.response?.body) {
      const responseBody = errAny.response.body;
      console.error("[Shopify Sync] Response Body:", JSON.stringify(responseBody, null, 2));
      
      // Try to extract GraphQL errors from response body
      if (responseBody.errors) {
        if (Array.isArray(responseBody.errors)) {
          detailedError = responseBody.errors.map((e: any) => e.message || String(e)).join("; ");
        } else if (responseBody.errors.message) {
          detailedError = responseBody.errors.message;
        }
      }
      
      // Try to extract userErrors if present
      if (responseBody.data?.productSet?.userErrors) {
        const userErrors = responseBody.data.productSet.userErrors;
        detailedError = userErrors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
      }
    }
    
    // Try to extract from error object directly
    if (!detailedError && errAny?.body) {
      const body = errAny.body;
      if (body.errors) {
        if (Array.isArray(body.errors)) {
          detailedError = body.errors.map((e: any) => e.message || String(e)).join("; ");
        } else if (body.errors.message) {
          detailedError = body.errors.message;
        }
      }
    }
    
    // Build final error message
    const baseMessage = errAny?.message || (error instanceof Error ? error.message : "Unknown error");
    const statusCode = errAny?.networkStatusCode || errAny?.response?.code || errAny?.response?.statusCode;
    
    if (detailedError) {
      throw new Error(
        `Failed to sync product to Shopify (${statusCode || "Unknown"}): ${detailedError}`
      );
    } else if (statusCode) {
      throw new Error(
        `Failed to sync product to Shopify: Received an error response (${statusCode}) from Shopify: ${baseMessage}`
      );
    }

    throw new Error(
      `Failed to sync product to Shopify: ${baseMessage}`
    );
  }
}

/**
 * Build Shopify product input from generated product data
 * Uses productSet format which supports creating products with full variant details
 */
function buildProductInput(product: GeneratedProduct, imageUrls?: string[]) {
  // Convert variants to Shopify productSet format
  const variants = product.variants.map((variant: ProductVariant) => {
    const variantInput: any = {
      price: variant.price.toString(),
      // Use option1 for Size variant
      option1: variant.size,
    };
    
    // Add optional fields only if they have valid values
    if (variant.sku && variant.sku.trim()) {
      variantInput.sku = variant.sku;
    }
    
    if (variant.compareAtPrice > 0) {
      variantInput.compareAtPrice = variant.compareAtPrice.toString();
    }
    
    if (variant.weight > 0) {
      variantInput.weight = variant.weight;
      variantInput.weightUnit = "GRAMS";
    }
    
    return variantInput;
  });

  // Build productSet input
  // productSet uses a nested 'product' object structure
  // Start with minimal required fields
  const productData: any = {
    title: product.title,
    // Define product options (required when using variants with options)
    options: ["Size"],
    variants,
  };

  // Add description (productSet uses descriptionHtml)
  if (product.descriptionHtml && product.descriptionHtml.trim()) {
    productData.descriptionHtml = product.descriptionHtml.trim();
  }
  
  // Add vendor and productType (optional but recommended)
  productData.vendor = "EZProduct";
  productData.productType = "AI Generated";
  
  // Add tags as string array (productSet expects array of strings)
  if (product.tags && product.tags.length > 0) {
    const tagsArray = Array.isArray(product.tags) 
      ? product.tags.filter(t => t && t.trim())
      : [String(product.tags)];
    if (tagsArray.length > 0) {
      productData.tags = tagsArray;
    }
  }

  // Add images if provided (productSet format)
  if (imageUrls && imageUrls.length > 0) {
    productData.images = imageUrls.map((src) => ({ src }));
  }

  // Add SEO metadata if provided (productSet format)
  if (product.seoTitle || product.seoDescription) {
    productData.seo = {};
    if (product.seoTitle) productData.seo.title = product.seoTitle;
    if (product.seoDescription) productData.seo.description = product.seoDescription;
  }

  // productSet expects input with a 'product' field
  return {
    product: productData,
  };
}

/**
 * Get next available SKU number
 * This would typically query your database for the highest SKU number
 */
export function generateNextSKU(baseNumber: number = 140200): string {
  // In production, this should query the database for the highest SKU
  // For now, we'll use a simple increment
  return `BJ${baseNumber}`;
}


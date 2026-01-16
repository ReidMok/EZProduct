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
}

/**
 * Initialize Shopify API client
 */
function getShopifyClient(config: ShopifyConfig) {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: process.env.SCOPES?.split(",") || ["write_products", "read_products"],
    hostName: process.env.SHOPIFY_APP_URL?.replace("https://", "") || "",
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
  const shopify = getShopifyClient(config);
  // IMPORTANT: Shopify GraphQL client expects a Session instance (not a plain object)
  const session = new Session({
    id: `offline_${config.shop}`,
    shop: config.shop,
    state: "",
    isOnline: false,
    accessToken: config.accessToken,
    scope: process.env.SCOPES,
  });

  // Build product input
  const productInput = buildProductInput(product, imageUrls);

  // GraphQL Mutation
  const mutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
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
    if (data.data?.productCreate?.userErrors?.length > 0) {
      const errors = data.data.productCreate.userErrors;
      const errorMessages = errors.map((e: any) => {
        const field = e.field ? `[${e.field}] ` : "";
        return `${field}${e.message}`;
      }).join("; ");
      console.error("[Shopify Sync] User Errors:", JSON.stringify(errors, null, 2));
      throw new Error(`Shopify API user errors: ${errorMessages}`);
    }

    // Check if product was created
    if (!data.data?.productCreate?.product) {
      console.error("[Shopify Sync] No product returned. Full response:", JSON.stringify(data, null, 2));
      throw new Error("Failed to create product: No product returned in response");
    }

    const createdProduct = data.data.productCreate.product;

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
    
    // Try to extract more details from the error
    if (errAny?.response) {
      console.error("[Shopify Sync] Error Response:", {
        status: errAny.response.statusCode || errAny.response.status,
        statusText: errAny.response.statusText,
        body: errAny.response.body,
        headers: errAny.response.headers,
      });
    }
    
    if (errAny?.networkStatusCode || errAny?.message) {
      throw new Error(
        `Failed to sync product to Shopify: Received an error response (${errAny.networkStatusCode || "Unknown"}) from Shopify: ${JSON.stringify({
          networkStatusCode: errAny.networkStatusCode,
          message: errAny.message,
          response: errAny.response,
        })}`
      );
    }

    throw new Error(
      `Failed to sync product to Shopify: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build Shopify product input from generated product data
 */
function buildProductInput(product: GeneratedProduct, imageUrls?: string[]) {
  // Convert variants to Shopify format
  // Start with minimal required fields to avoid validation errors
  const variants = product.variants.map((variant: ProductVariant) => {
    const variantInput: any = {
      price: variant.price.toString(),
      // Use option1 for Size variant (Shopify GraphQL API format)
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

  // Build product input - start with minimal required fields only
  const input: any = {
    title: product.title,
    // Define product options BEFORE variants (required when using variant options)
    options: ["Size"],
    variants,
  };

  // Add description (bodyHtml) - sanitize if needed
  if (product.descriptionHtml && product.descriptionHtml.trim()) {
    // Ensure HTML is properly formatted (Shopify may reject malformed HTML)
    input.bodyHtml = product.descriptionHtml.trim();
  }
  
  // Add vendor and productType
  input.vendor = "EZProduct";
  input.productType = "AI Generated";
  
  // Add tags as comma-separated string (Shopify expects string, not array)
  if (product.tags && product.tags.length > 0) {
    const tagsString = Array.isArray(product.tags) 
      ? product.tags.filter(t => t && t.trim()).join(", ") 
      : String(product.tags);
    if (tagsString) {
      input.tags = tagsString;
    }
  }

  // Temporarily skip images and SEO to isolate the issue
  // We'll add them back once basic product creation works
  // if (imageUrls && imageUrls.length > 0) {
  //   input.images = imageUrls.map((src) => ({ src }));
  // }
  // if (product.seoTitle || product.seoDescription) {
  //   input.seo = {};
  //   if (product.seoTitle) input.seo.title = product.seoTitle;
  //   if (product.seoDescription) input.seo.description = product.seoDescription;
  // }

  return input;
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


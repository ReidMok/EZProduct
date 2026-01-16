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
    
    const response = await client.request({
      data: {
        query: mutation,
        variables: {
          input: productInput,
        },
      },
    });

    const data = response.body as any;
    
    // Log full response for debugging
    console.log("[Shopify Sync] Response:", JSON.stringify(data, null, 2));

    // Check for GraphQL user errors
    if (data.data?.productCreate?.userErrors?.length > 0) {
      const errors = data.data.productCreate.userErrors;
      const errorMessages = errors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join(", ");
      console.error("[Shopify Sync] User Errors:", errors);
      throw new Error(`Shopify API errors: ${errorMessages}`);
    }

    // Check for GraphQL errors (different from userErrors)
    if (data.errors && data.errors.length > 0) {
      const errorMessages = data.errors.map((e: any) => e.message).join(", ");
      console.error("[Shopify Sync] GraphQL Errors:", data.errors);
      throw new Error(`Shopify GraphQL errors: ${errorMessages}`);
    }

    if (!data.data?.productCreate?.product) {
      console.error("[Shopify Sync] No product returned. Full response:", JSON.stringify(data, null, 2));
      throw new Error("Failed to create product: No product returned");
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
  // IMPORTANT: Shopify requires variants to have 'options' array with exactly one option value
  const variants = product.variants.map((variant: ProductVariant) => {
    const variantInput: any = {
      price: variant.price.toString(),
      sku: variant.sku,
      // Only include compareAtPrice if it's greater than 0
      ...(variant.compareAtPrice > 0 && { compareAtPrice: variant.compareAtPrice.toString() }),
      // Include weight only if provided and greater than 0
      ...(variant.weight > 0 && {
        weight: variant.weight,
        weightUnit: "GRAMS",
      }),
      // REQUIRED: Each variant must have an options array with the variant size
      options: [variant.size],
    };
    return variantInput;
  });

  // Build product input
  const input: any = {
    title: product.title,
    bodyHtml: product.descriptionHtml, // Shopify uses 'bodyHtml' not 'descriptionHtml'
    vendor: "EZProduct",
    productType: "AI Generated",
    // Tags should be a comma-separated string
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : product.tags,
    variants,
  };

  // Add images if provided
  if (imageUrls && imageUrls.length > 0) {
    input.images = imageUrls.map((src) => ({ src }));
  }

  // Add SEO metadata if provided
  if (product.seoTitle || product.seoDescription) {
    input.seo = {
      ...(product.seoTitle && { title: product.seoTitle }),
      ...(product.seoDescription && { description: product.seoDescription }),
    };
  }

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


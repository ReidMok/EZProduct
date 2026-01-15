/**
 * Shopify Product Sync Utility
 * Handles creating products in Shopify via GraphQL API
 */

import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
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
  const session = {
    shop: config.shop,
    accessToken: config.accessToken,
  };

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
    const response = await client.request({
      data: {
        query: mutation,
        variables: {
          input: productInput,
        },
      },
    });

    const data = response.body as any;

    if (data.data?.productCreate?.userErrors?.length > 0) {
      const errors = data.data.productCreate.userErrors;
      throw new Error(
        `Shopify API errors: ${errors.map((e: any) => e.message).join(", ")}`
      );
    }

    if (!data.data?.productCreate?.product) {
      throw new Error("Failed to create product: No product returned");
    }

    const createdProduct = data.data.productCreate.product;

    return {
      productId: createdProduct.id,
      productHandle: createdProduct.handle,
    };
  } catch (error) {
    console.error("Shopify Sync Error:", error);
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
  const variants = product.variants.map((variant: ProductVariant) => ({
    price: variant.price.toString(),
    compareAtPrice: variant.compareAtPrice.toString(),
    sku: variant.sku,
    weight: variant.weight,
    weightUnit: "GRAMS",
    inventoryPolicy: "CONTINUE",
    inventoryManagement: "SHOPIFY",
    inventoryQuantities: [
      {
        availableQuantity: 100,
        locationId: "gid://shopify/Location/1", // Default location, should be fetched dynamically
      },
    ],
  }));

  // Build product input
  const input: any = {
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    vendor: "RESIN MEMORY",
    productType: "OCEAN ART",
    tags: product.tags,
    status: "ACTIVE",
    variants: variants,
  };

  // Add SEO metadata
  if (product.seoTitle || product.seoDescription) {
    input.metafields = [];
    
    if (product.seoTitle) {
      input.metafields.push({
        namespace: "custom",
        key: "seo_title",
        value: product.seoTitle,
        type: "single_line_text_field",
      });
    }

    if (product.seoDescription) {
      input.metafields.push({
        namespace: "custom",
        key: "seo_description",
        value: product.seoDescription,
        type: "multi_line_text_field",
      });
    }
  }

  // Add images if provided
  if (imageUrls && imageUrls.length > 0) {
    input.media = imageUrls.map((url, index) => ({
      mediaContentType: "IMAGE",
      originalSource: url,
      alt: `${product.title} - Image ${index + 1}`,
    }));
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


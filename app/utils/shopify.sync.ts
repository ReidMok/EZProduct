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
 * Uses the two-step approach: productCreate + productVariantsBulkCreate
 */
export async function createShopifyProduct(
  product: GeneratedProduct,
  config: ShopifyConfig,
  imageUrls?: string[]
): Promise<{ productId: string; productHandle: string }> {
  const shopify = getShopifyClient();
  const session = config.session;
  const client = new shopify.clients.Graphql({ session });

  try {
    // Step 1: Create product with options (this creates the product + first default variant)
    // Start with minimal input to isolate the issue
    const productInput = buildProductCreateInput(product, imageUrls);
    
    const createMutation = `
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

    console.log("[Shopify Sync] Step 1: Creating product with options...");
    console.log("[Shopify Sync] ========== FULL REQUEST DETAILS ==========");
    console.log("[Shopify Sync] Mutation String:", createMutation);
    console.log("[Shopify Sync] Variables:", JSON.stringify({ input: productInput }, null, 2));
    console.log("[Shopify Sync] Product Input (detailed):", JSON.stringify(productInput, null, 2));
    console.log("[Shopify Sync] Session Shop:", session.shop);
    console.log("[Shopify Sync] Session AccessToken (first 20 chars):", session.accessToken?.substring(0, 20) + "...");
    console.log("[Shopify Sync] ==========================================");
    
    // Try using direct HTTP request to get more detailed error information
    // This bypasses the Shopify API client wrapper that might be hiding errors
    const shopDomain = session.shop;
    const graphqlUrl = `https://${shopDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`;
    
    console.log("[Shopify Sync] GraphQL URL:", graphqlUrl);
    
    let createResponse: any;
    try {
      // Use Shopify GraphQL client - request method accepts query string and variables object
      createResponse = await client.request(createMutation, {
        variables: {
          input: productInput,
        },
      });
      console.log("[Shopify Sync] Request succeeded with Shopify client");
    } catch (requestError: any) {
      console.error("[Shopify Sync] Request Error (caught in inner try-catch):", requestError);
      console.error("[Shopify Sync] Request Error Type:", typeof requestError);
      console.error("[Shopify Sync] Request Error Keys:", Object.keys(requestError || {}));
      console.error("[Shopify Sync] Request Error Message:", requestError?.message);
      console.error("[Shopify Sync] Request Error Stack:", requestError?.stack);
      
      if (requestError?.response) {
        console.error("[Shopify Sync] Request Error Response (full):", JSON.stringify(requestError.response, null, 2));
        if (requestError.response.body) {
          console.error("[Shopify Sync] Request Error Response Body:", JSON.stringify(requestError.response.body, null, 2));
        }
      }
      if (requestError?.body) {
        console.error("[Shopify Sync] Request Error Body (direct):", JSON.stringify(requestError.body, null, 2));
      }
      
      // Try direct HTTP request to get raw response
      try {
        console.log("[Shopify Sync] Attempting direct HTTP request to get raw error...");
        const directResponse = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': session.accessToken!,
          },
          body: JSON.stringify({
            query: createMutation,
            variables: {
              input: productInput,
            },
          }),
        });
        
        const directResponseText = await directResponse.text();
        console.log("[Shopify Sync] Direct HTTP Response Status:", directResponse.status);
        console.log("[Shopify Sync] Direct HTTP Response Headers:", Object.fromEntries(directResponse.headers.entries()));
        console.log("[Shopify Sync] Direct HTTP Response Body (raw):", directResponseText);
        
        try {
          const directResponseJson = JSON.parse(directResponseText);
          console.log("[Shopify Sync] Direct HTTP Response Body (parsed):", JSON.stringify(directResponseJson, null, 2));
        } catch (e) {
          console.error("[Shopify Sync] Failed to parse direct response as JSON:", e);
        }
      } catch (directError: any) {
        console.error("[Shopify Sync] Direct HTTP request also failed:", directError);
      }
      
      throw requestError;
    }

    // Shopify GraphQL client may return data directly or wrapped in body
    const createData = ((createResponse as any).body || createResponse) as any;
    console.log("[Shopify Sync] ========== FULL RESPONSE DETAILS ==========");
    console.log("[Shopify Sync] Response Object Keys:", Object.keys(createResponse || {}));
    console.log("[Shopify Sync] Response (full):", JSON.stringify(createResponse, null, 2));
    console.log("[Shopify Sync] Response Body (if exists):", JSON.stringify(createResponse.body, null, 2));
    console.log("[Shopify Sync] Create Data (parsed):", JSON.stringify(createData, null, 2));
    console.log("[Shopify Sync] Has data?:", !!createData?.data);
    console.log("[Shopify Sync] Has errors?:", !!createData?.errors);
    if (createData?.data) {
      console.log("[Shopify Sync] Data Keys:", Object.keys(createData.data));
      if (createData.data.productCreate) {
        console.log("[Shopify Sync] productCreate Keys:", Object.keys(createData.data.productCreate));
        console.log("[Shopify Sync] productCreate.userErrors:", createData.data.productCreate.userErrors);
        console.log("[Shopify Sync] productCreate.product:", createData.data.productCreate.product);
      }
    }
    if (createData?.errors) {
      console.log("[Shopify Sync] Errors (full):", JSON.stringify(createData.errors, null, 2));
    }
    console.log("[Shopify Sync] ============================================");

    // Check for GraphQL errors FIRST
    if (createData.errors && Array.isArray(createData.errors) && createData.errors.length > 0) {
      const errorMessages = createData.errors.map((e: any) => {
        const msg = e.message || String(e);
        const path = e.path ? ` (path: ${JSON.stringify(e.path)})` : "";
        const locations = e.locations ? ` (line: ${e.locations[0]?.line}, column: ${e.locations[0]?.column})` : "";
        return `${msg}${path}${locations}`;
      }).join("; ");
      console.error("[Shopify Sync] GraphQL Errors:", JSON.stringify(createData.errors, null, 2));
      throw new Error(`Shopify GraphQL errors: ${errorMessages}`);
    }

    // Check for user errors
    if (createData.data?.productCreate?.userErrors?.length > 0) {
      const errors = createData.data.productCreate.userErrors;
      const errorMessages = errors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
      console.error("[Shopify Sync] User Errors:", JSON.stringify(errors, null, 2));
      throw new Error(`Shopify API user errors: ${errorMessages}`);
    }

    if (!createData.data?.productCreate?.product) {
      console.error("[Shopify Sync] No product returned. Full response:", JSON.stringify(createData, null, 2));
      throw new Error("Failed to create product: No product returned");
    }

    const createdProduct = createData.data.productCreate.product;
    const productId = createdProduct.id;

    // Step 2: Create all variants using productVariantsBulkCreate
    const variantsInput = buildVariantsBulkInput(product.variants, productId);
    
    const variantsMutation = `
      mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants {
            id
            title
            price
            sku
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    console.log("[Shopify Sync] Step 2: Creating variants...");
    console.log("[Shopify Sync] Variants Input:", JSON.stringify(variantsInput, null, 2));
    
    const variantsResponse = await client.request(variantsMutation, {
      variables: {
        productId: productId,
        variants: variantsInput,
      },
    });

    // Shopify GraphQL client may return data directly or wrapped in body
    const variantsData = ((variantsResponse as any).body || variantsResponse) as any;
    console.log("[Shopify Sync] Variants Create Response:", JSON.stringify(variantsData, null, 2));

    // Check for errors
    if (variantsData.errors && Array.isArray(variantsData.errors) && variantsData.errors.length > 0) {
      const errorMessages = variantsData.errors.map((e: any) => e.message || String(e)).join("; ");
      throw new Error(`Shopify GraphQL errors (variants): ${errorMessages}`);
    }

    if (variantsData.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
      const errors = variantsData.data.productVariantsBulkCreate.userErrors;
      const errorMessages = errors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
      throw new Error(`Shopify API user errors (variants): ${errorMessages}`);
    }

    console.log("[Shopify Sync] Product and variants created successfully!");

    return {
      productId: productId,
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
    
    // Log the full error structure for debugging
    console.error("[Shopify Sync] Full Error Object:", JSON.stringify(errAny, null, 2));
    
    if (errAny?.response?.body) {
      const responseBody = errAny.response.body;
      console.error("[Shopify Sync] Response Body (full):", JSON.stringify(responseBody, null, 2));
      
      // Try to extract GraphQL errors from response body
      if (responseBody.errors) {
        if (Array.isArray(responseBody.errors)) {
          detailedError = responseBody.errors.map((e: any) => {
            const msg = e.message || String(e);
            const path = e.path ? ` (path: ${JSON.stringify(e.path)})` : "";
            const locations = e.locations ? ` (line: ${e.locations[0]?.line}, column: ${e.locations[0]?.column})` : "";
            return `${msg}${path}${locations}`;
          }).join("; ");
        } else if (responseBody.errors.message) {
          detailedError = responseBody.errors.message;
        }
      }
      
      // Try to extract userErrors if present
      if (responseBody.data?.productCreate?.userErrors) {
        const userErrors = responseBody.data.productCreate.userErrors;
        detailedError = userErrors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
      }
      
      // Try to extract from nested response object
      if (responseBody.response && typeof responseBody.response === 'object') {
        try {
          const nestedResponse = responseBody.response;
          if (nestedResponse.body) {
            const nestedBody = typeof nestedResponse.body === 'string' 
              ? JSON.parse(nestedResponse.body) 
              : nestedResponse.body;
            console.error("[Shopify Sync] Nested Response Body:", JSON.stringify(nestedBody, null, 2));
            
            if (nestedBody.errors) {
              if (Array.isArray(nestedBody.errors)) {
                detailedError = nestedBody.errors.map((e: any) => e.message || String(e)).join("; ");
              }
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // Try to extract from error object directly
    if (!detailedError && errAny?.body) {
      const body = errAny.body;
      console.error("[Shopify Sync] Error Body (direct):", JSON.stringify(body, null, 2));
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
 * Build ProductInput for productCreate mutation
 * This creates the product and defines options, but only creates the first default variant
 * Note: Using minimal fields first to isolate issues
 */
function buildProductCreateInput(product: GeneratedProduct, imageUrls?: string[]) {
  // Start with absolute minimum required fields
  const input: any = {
    title: product.title,
  };

  // Add description (try bodyHtml first, which is the standard field)
  if (product.descriptionHtml && product.descriptionHtml.trim()) {
    input.bodyHtml = product.descriptionHtml.trim();
  }
  
  // Add vendor and productType (optional but recommended)
  input.vendor = "EZProduct";
  input.productType = "AI Generated";
  
  // Add tags as comma-separated string
  if (product.tags && product.tags.length > 0) {
    const tagsString = Array.isArray(product.tags) 
      ? product.tags.filter(t => t && t.trim()).join(", ")
      : String(product.tags);
    if (tagsString) {
      input.tags = tagsString;
    }
  }

  // Define product options - this tells Shopify the product has a "Size" option
  // We'll create variants separately using productVariantsBulkCreate
  input.options = ["Size"];

  // Temporarily skip images and SEO to isolate the issue
  // We'll add them back once basic product creation works

  return input;
}

/**
 * Build ProductVariantsBulkInput for productVariantsBulkCreate mutation
 * This creates all variants with their prices, SKUs, etc.
 */
function buildVariantsBulkInput(variants: ProductVariant[], productId: string) {
  return variants.map((variant: ProductVariant) => {
    const variantInput: any = {
      // Use optionValues to specify which option values this variant uses
      // Format: [{ option: "Size", value: "6inch" }]
      optionValues: [
        {
          option: "Size",
          value: variant.size,
        },
      ],
      price: variant.price.toString(),
    };
    
    // Add optional fields
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


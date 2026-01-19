/**
 * Shopify Product Sync Utility
 * Handles creating products in Shopify via GraphQL API
 */

import type { Session } from "@shopify/shopify-api";
import type { GeneratedProduct, ProductVariant } from "./ai.generator";

interface ShopifyConfig {
  shop: string;
  accessToken: string;
  session: Session; // Pass the actual session from shopify.authenticate.admin()
  admin: any; // Pass the admin object from shopify.authenticate.admin()
  debugId?: string;
}

/**
 * Create product in Shopify
 * Uses the two-step approach: productCreate + productVariantsBulkCreate
 * 
 * IMPORTANT: Uses the admin object from Shopify App Remix, which handles
 * authentication automatically and ensures the accessToken is valid.
 */
export async function createShopifyProduct(
  product: GeneratedProduct,
  config: ShopifyConfig,
  imageUrls?: string[]
): Promise<{ productId: string; productHandle: string }> {
  const { admin, session, debugId } = config;
  const pfx = debugId ? `[Shopify Sync][debugId=${debugId}]` : "[Shopify Sync]";

  // Validate admin object
  if (!admin) {
    throw new Error("Admin object is missing. Make sure to pass admin from shopify.authenticate.admin(request)");
  }
  if (!admin.graphql) {
    throw new Error("admin.graphql is not available. Admin object: " + JSON.stringify(Object.keys(admin || {})));
  }
  if (!session) {
    throw new Error("Session is missing");
  }
  if (!session.accessToken) {
    throw new Error("Session accessToken is missing");
  }

  console.log(`${pfx} Admin object type:`, typeof admin);
  console.log(`${pfx} Admin object keys:`, Object.keys(admin || {}));
  console.log(`${pfx} admin.graphql type:`, typeof admin.graphql);

  try {
    // Step 1: Create product
    // NOTE: Based on real logs (API version 2025-04), Shopify expects:
    //   productCreate(product: ProductCreateInput!)
    // and ProductInput does NOT include bodyHtml/options.
    const productCreateInput = buildProductCreateInputForProductCreate(product, imageUrls);
    const productCreateInputAlt = buildProductCreateInputForProductCreateAltValues(product, imageUrls);

    const createCandidates: Array<{ name: string; mutation: string; variables: any }> = [
      {
        name: "productCreate(product: ProductCreateInput!) + productOptions(values: {name})",
        mutation: `
          mutation productCreate($product: ProductCreateInput!) {
            productCreate(product: $product) {
              product { 
                id 
                handle 
                title 
                status
                variants(first: 10) {
                  nodes { id title }
                }
              }
              userErrors { field message }
            }
          }
        `,
        variables: { product: productCreateInput },
      },
      {
        name: "productCreate(product: ProductCreateInput!) + productOptions(values: string[])",
        mutation: `
          mutation productCreate($product: ProductCreateInput!) {
            productCreate(product: $product) {
              product { 
                id 
                handle 
                title 
                status
                variants(first: 10) {
                  nodes { id title }
                }
              }
              userErrors { field message }
            }
          }
        `,
        variables: { product: productCreateInputAlt },
      },
      // Keep a legacy fallback for older schemas
      {
        name: "productCreate(input: ProductInput!) (legacy fallback)",
        mutation: `
          mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
              product { 
                id 
                handle 
                title 
                status
                variants(first: 10) {
                  nodes { id title }
                }
              }
              userErrors { field message }
            }
          }
        `,
        variables: { input: buildLegacyProductInput(product) },
      },
    ];

    console.log(`${pfx} Step 1: Creating product... candidates=${createCandidates.length}`);
    console.log(`${pfx} Session Shop:`, session.shop);

    const createResult = await runGraphqlWithCandidates(admin, createCandidates, pfx);
    const createdProduct = createResult?.data?.productCreate?.product;
    if (!createdProduct?.id) {
      console.error(`${pfx} No product returned. Full response:`, JSON.stringify(createResult, null, 2));
      throw new Error("Failed to create product: No product returned");
    }
    const productId = createdProduct.id as string;

    // Check if variants were auto-created by productCreate (when productOptions.values was passed)
    const existingVariants = createdProduct.variants?.nodes || createdProduct.variants || [];
    console.log(`${pfx} Product created. Existing variants count:`, existingVariants.length);
    
    if (existingVariants.length > 0) {
      // Step 2a: Update existing variants with prices using productVariantsBulkUpdate
      console.log(`${pfx} Step 2: Updating ${existingVariants.length} existing variants with prices...`);
      
      // Map our variant data to existing variant IDs by matching size
      const variantUpdates = existingVariants.map((existingVariant: any) => {
        // Extract size from variant title (e.g., "6inch" from title "Product / 6inch")
        const variantTitle = existingVariant.title || "";
        const matchingVariant = product.variants.find((v) => variantTitle.includes(v.size));
        
        return {
          id: existingVariant.id,
          price: matchingVariant ? matchingVariant.price.toString() : product.variants[0]?.price.toString() || "19.99",
          compareAtPrice: matchingVariant && matchingVariant.compareAtPrice > 0 
            ? matchingVariant.compareAtPrice.toString() 
            : undefined,
        };
      });

      const updateMutation = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id title price }
            userErrors { field message }
          }
        }
      `;
      
      try {
        const updateRaw = await admin.graphql(updateMutation, {
          variables: { productId, variants: variantUpdates },
        });
        const updateResult = await normalizeAdminGraphqlResult(updateRaw, pfx);
        
        if (updateResult?.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          const errors = updateResult.data.productVariantsBulkUpdate.userErrors;
          console.error(`${pfx} Variant update errors:`, JSON.stringify(errors, null, 2));
          // Don't fail - product was created successfully, just prices weren't updated
        } else {
          console.log(`${pfx} Variants updated with prices successfully!`);
        }
      } catch (updateError) {
        console.error(`${pfx} Failed to update variant prices:`, updateError);
        // Don't fail - product was created successfully
      }
    } else {
      // Step 2b: No variants exist, create them using productVariantsBulkCreate
      const variantsCandidates: Array<{ name: string; mutation: string; variables: any }> = [
        {
          name: "productVariantsBulkCreate(ProductVariantsBulkInput + optionName/name)",
          mutation: `
            mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkCreate(productId: $productId, variants: $variants) {
                productVariants { id title price }
                userErrors { field message }
              }
            }
          `,
          variables: {
            productId,
            variants: buildVariantsBulkInput(product.variants, "optionName_name"),
          },
        },
      ];

      console.log(`${pfx} Step 2: Creating variants...`);
      const variantsResult = await runGraphqlWithCandidates(admin, variantsCandidates, pfx);
      const variantsData = variantsResult as any;
      if (variantsData?.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
        const errors = variantsData.data.productVariantsBulkCreate.userErrors;
        const errorMessages = errors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
        throw new Error(`Shopify API user errors (variants): ${errorMessages}`);
      }
    }

    console.log(`${pfx} Product and variants created/updated successfully!`);

    return {
      productId: productId,
      productHandle: createdProduct.handle,
    };
  } catch (error) {
    // Same rule: do not swallow redirect Responses.
    if (error instanceof Response) {
      console.log(`${pfx} Passing through Response (redirect) from Shopify sync flow.`);
      console.log(`${pfx} Response Status:`, error.status);
      console.log(`${pfx} Response Location:`, error.headers.get("location"));
      throw error;
    }

    // Enhanced error logging for debugging
    console.error(`${pfx} Error Details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    
    const errAny = error as any;
    
    // Try to extract more details from the error response
    let detailedError = "";
    
    // Log the full error structure for debugging
    console.error(`${pfx} Full Error Object:`, JSON.stringify(errAny, null, 2));
    
    if (errAny?.response?.body) {
      const responseBody = errAny.response.body;
      console.error(`${pfx} Response Body (full):`, JSON.stringify(responseBody, null, 2));
      
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
                    console.error(`${pfx} Nested Response Body:`, JSON.stringify(nestedBody, null, 2));
            
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
      console.error(`${pfx} Error Body (direct):`, JSON.stringify(body, null, 2));
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
      throw new Error(`Failed to sync product to Shopify (${statusCode || "Unknown"}): ${detailedError}`);
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

function uniqueSizes(product: GeneratedProduct): string[] {
  return Array.from(new Set((product.variants || []).map((v) => v.size).filter(Boolean)));
}

/**
 * Preferred schema for API 2025-04: ProductCreateInput + descriptionHtml + productOptions
 */
function buildProductCreateInputForProductCreate(product: GeneratedProduct, imageUrls?: string[]) {
  const sizeValues = uniqueSizes(product);
  const input: any = {
    title: product.title,
    vendor: "EZProduct",
    productType: "AI Generated",
  };

  // GraphQL uses descriptionHtml (NOT bodyHtml)
  if (product.descriptionHtml && product.descriptionHtml.trim()) {
    input.descriptionHtml = product.descriptionHtml.trim();
  }

  if (product.tags && product.tags.length > 0) {
    input.tags = Array.isArray(product.tags) ? product.tags.filter((t) => t && t.trim()) : product.tags;
  }

  // Define productOptions with values - Shopify needs to know about the Size option
  // productVariantsBulkCreate will UPDATE these variants with prices, not CREATE new ones
  if (sizeValues.length > 0) {
    input.productOptions = [
      {
        name: "Size",
        values: sizeValues.map((name) => ({ name })),
      },
    ];
  }

  // keep images disabled by default; add back after base create works
  void imageUrls;
  return input;
}

function buildProductCreateInputForProductCreateAltValues(product: GeneratedProduct, imageUrls?: string[]) {
  // Same as buildProductCreateInputForProductCreate - no productOptions to avoid variant conflicts
  return buildProductCreateInputForProductCreate(product, imageUrls);
}

/**
 * Legacy ProductInput fallback (for older schemas only)
 */
function buildLegacyProductInput(product: GeneratedProduct) {
  const input: any = { title: product.title };
  if (product.descriptionHtml && product.descriptionHtml.trim()) {
    input.descriptionHtml = product.descriptionHtml.trim();
  }
  return input;
}

/**
 * Build ProductVariantsBulkInput for productVariantsBulkCreate mutation
 * This creates all variants with their prices, SKUs, etc.
 */
function buildVariantsBulkInput(
  variants: ProductVariant[],
  optionStyle: "option_value" | "optionName_name"
) {
  return variants.map((variant: ProductVariant) => {
    const variantInput: any = {
      optionValues:
        optionStyle === "optionName_name"
          ? [
              // Newer input object shape
              { optionName: "Size", name: variant.size },
            ]
          : [
              // Older/community shape
              { option: "Size", value: variant.size },
            ],
      price: variant.price.toString(),
    };
    
    // Optional fields: keep only what the schema accepts.
    // In API 2025-04, ProductVariantsBulkInput does NOT include sku/weight/weightUnit.
    // We'll set SKU/weight in a follow-up mutation once bulk creation succeeds.
    if (variant.compareAtPrice > 0) {
      variantInput.compareAtPrice = variant.compareAtPrice.toString();
    }
    return variantInput;
  });
}

async function runGraphqlWithCandidates(
  admin: any,
  candidates: Array<{ name: string; mutation: string; variables: any }>,
  pfx: string
) {
  let lastError: any;

  for (const c of candidates) {
    console.log(`${pfx} Trying candidate: ${c.name}`);
    try {
      const raw = await admin.graphql(c.mutation, { variables: c.variables });
      const data = await normalizeAdminGraphqlResult(raw, pfx);
      if (data?.errors?.length) {
        const msg = data.errors.map((e: any) => e?.message || String(e)).join("; ");
        console.error(`${pfx} Candidate GraphQL errors:`, JSON.stringify(data.errors, null, 2));
        lastError = new Error(msg);
        continue;
      }

      if (data?.data?.productCreate?.userErrors?.length) {
        const errors = data.data.productCreate.userErrors;
        const msg = errors.map((e: any) => `${e.field ? `[${e.field}] ` : ""}${e.message}`).join("; ");
        lastError = new Error(msg);
        console.error(`${pfx} Candidate userErrors:`, JSON.stringify(errors, null, 2));
        continue;
      }

      // For variants mutation, userErrors are checked by caller; treat no data as failure
      if (!data?.data) {
        lastError = new Error("No data returned");
        continue;
      }

      console.log(`${pfx} Candidate success: ${c.name}`);
      return data;
    } catch (e: any) {
      if (e instanceof Response) {
        console.log(`${pfx} Candidate threw Response (redirect).`);
        throw e;
      }
      lastError = e;
      const m = e?.message || String(e);
      console.error(`${pfx} Candidate failed: ${c.name} error=${m}`);

      // If this is a schema mismatch (unknown argument/type), try next candidate
      if (
        typeof m === "string" &&
        (m.includes("Unknown argument") ||
          m.includes("Unknown type") ||
          m.includes("Field") ||
          m.includes("has no argument") ||
          m.includes("not defined") ||
          m.includes("Expected type"))
      ) {
        continue;
      }

      // Otherwise, still allow next candidate, but keep lastError for final throw.
      continue;
    }
  }

  throw lastError || new Error("All GraphQL candidates failed");
}

async function normalizeAdminGraphqlResult(raw: any, pfx: string) {
  // shopify-app-remix admin.graphql can return either:
  // - a parsed object: { data, errors, extensions }
  // - a Fetch Response-like object (status, headers, json())
  if (!raw) return raw;

  // Response-like: has status + headers + json()
  const isResponseLike =
    typeof raw === "object" &&
    typeof raw.status === "number" &&
    raw.headers &&
    typeof raw.json === "function";

  if (!isResponseLike) return raw;

  const r = raw as Response;
  const location = r.headers.get("location") || r.headers.get("Location");
  console.log(`${pfx} admin.graphql returned Response. status=${r.status} location=${location || "n/a"}`);

  // Redirects must be handled by Remix/browser (token refresh / exit-iframe)
  if (location && [301, 302, 303, 307, 308].includes(r.status)) {
    throw r;
  }

  // Parse JSON body (GraphQL result)
  try {
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      console.warn(`${pfx} admin.graphql Response content-type is not JSON: ${ct}`);
    }
    const parsed = await r.json();
    return parsed;
  } catch (err) {
    console.error(`${pfx} Failed to parse admin.graphql Response as JSON`, err);
    throw err;
  }
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


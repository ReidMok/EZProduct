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
  imageUrls?: string[]; // Optional image URLs to attach to the product
  brandName?: string; // Optional brand/vendor name for the product
  productType?: string; // Optional product type/category
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
  config: ShopifyConfig
): Promise<{ productId: string; productHandle: string }> {
  const { admin, session, debugId, imageUrls, brandName, productType } = config;
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
    const productCreateInput = buildProductCreateInputForProductCreate(product, imageUrls, brandName, productType);
    const productCreateInputAlt = buildProductCreateInputForProductCreateAltValues(product, imageUrls, brandName, productType);

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

    // Check existing variants created by productCreate
    const existingVariants = createdProduct.variants?.nodes || createdProduct.variants || [];
    console.log(`${pfx} Product created. Existing variants count:`, existingVariants.length);
    console.log(`${pfx} Required variants count:`, product.variants.length);
    console.log(`${pfx} Required variant sizes:`, product.variants.map(v => v.size).join(', '));
    
    // Step 2: Handle variants
    // When productOptions is set, Shopify auto-creates variants for each option value
    // We need to update these variants with correct prices
    
    if (existingVariants.length >= product.variants.length) {
      // Shopify created variants for each option value - update prices by matching names
      console.log(`${pfx} Step 2: Updating ${existingVariants.length} auto-created variants with prices...`);
      
      for (const existingVariant of existingVariants) {
        // Match by title/name - Shopify may create variants in different order
        const variantTitle = existingVariant.title || "";
        const ourVariant = product.variants.find((v: ProductVariant) => 
          variantTitle.toLowerCase().includes(v.size.toLowerCase()) ||
          v.size.toLowerCase().includes(variantTitle.toLowerCase())
        );
        
        // If no match found, use the first unmatched variant from our list
        const priceVariant = ourVariant || product.variants[0];
        
        const updateMutation = `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant { id title price inventoryItem { id } }
              userErrors { field message }
            }
          }
        `;
        
        try {
          const updateRaw = await admin.graphql(updateMutation, {
            variables: {
              input: {
                id: existingVariant.id,
                price: priceVariant.price.toString(),
                compareAtPrice: priceVariant.compareAtPrice > 0 ? priceVariant.compareAtPrice.toString() : undefined,
                inventoryPolicy: "CONTINUE", // Track inventory for this variant
              }
            },
          });
          const updateResult = await normalizeAdminGraphqlResult(updateRaw, pfx);
          if (updateResult?.data?.productVariantUpdate?.userErrors?.length > 0) {
            console.error(`${pfx} Variant update error for ${existingVariant.title}:`, updateResult.data.productVariantUpdate.userErrors);
          } else {
            console.log(`${pfx} Updated variant "${variantTitle}" with price $${priceVariant.price}`);
          }
        } catch (updateError) {
          console.error(`${pfx} Failed to update variant ${existingVariant.title}:`, updateError);
        }
      }
    } else if (existingVariants.length === 1 && product.variants.length > 1) {
      // Only one default variant exists, but we need multiple
      // First delete the default variant, then create all variants fresh
      console.log(`${pfx} Step 2: Replacing default variant with ${product.variants.length} variants...`);
      
      const defaultVariantId = existingVariants[0].id;
      
      // Create all variants first (Shopify requires at least one variant)
      const createVariantsMutation = `
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
          productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
            productVariants { id title price }
            userErrors { field message }
          }
        }
      `;
      
      const variantsInput = product.variants.map((variant: ProductVariant) => ({
        optionValues: [{ optionName: "Size", name: variant.size }],
        price: variant.price.toString(),
        compareAtPrice: variant.compareAtPrice > 0 ? variant.compareAtPrice.toString() : undefined,
      }));
      
      console.log(`${pfx} Creating ${variantsInput.length} variants...`);
      
      try {
        const createRaw = await admin.graphql(createVariantsMutation, {
          variables: { 
            productId, 
            variants: variantsInput,
            strategy: "REMOVE_STANDALONE_VARIANT" // This removes the default "Default Title" variant
          },
        });
        const createResult = await normalizeAdminGraphqlResult(createRaw, pfx);
        
        if (createResult?.data?.productVariantsBulkCreate?.userErrors?.length > 0) {
          const errors = createResult.data.productVariantsBulkCreate.userErrors;
          console.error(`${pfx} Variant creation errors:`, JSON.stringify(errors, null, 2));
          
          // If strategy failed, try without it and manually delete default variant after
          console.log(`${pfx} Retrying without strategy...`);
          const retryRaw = await admin.graphql(createVariantsMutation.replace(', $strategy: ProductVariantsBulkCreateStrategy', '').replace(', strategy: $strategy', ''), {
            variables: { productId, variants: variantsInput },
          });
          const retryResult = await normalizeAdminGraphqlResult(retryRaw, pfx);
          
          if (retryResult?.data?.productVariantsBulkCreate?.productVariants?.length > 0) {
            console.log(`${pfx} Successfully created ${retryResult.data.productVariantsBulkCreate.productVariants.length} variants`);
            
            // Now delete the original default variant
            try {
              const deleteMutation = `
                mutation productVariantDelete($id: ID!) {
                  productVariantDelete(id: $id) {
                    deletedProductVariantId
                    userErrors { field message }
                  }
                }
              `;
              await admin.graphql(deleteMutation, { variables: { id: defaultVariantId } });
              console.log(`${pfx} Deleted default variant`);
            } catch (deleteError) {
              console.error(`${pfx} Could not delete default variant:`, deleteError);
            }
          }
        } else {
          const createdVariants = createResult?.data?.productVariantsBulkCreate?.productVariants || [];
          console.log(`${pfx} Successfully created ${createdVariants.length} variants`);
        }
      } catch (createError) {
        console.error(`${pfx} Failed to create variants:`, createError);
      }
    } else {
      // Single variant case - just update the price
      console.log(`${pfx} Step 2: Updating single variant price...`);
      const firstVariant = product.variants[0];
      const existingVariantId = existingVariants[0]?.id;
      
      if (existingVariantId) {
        const updateMutation = `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant { id title price }
              userErrors { field message }
            }
          }
        `;
        
        try {
          const updateRaw = await admin.graphql(updateMutation, {
            variables: {
              input: {
                id: existingVariantId,
                price: firstVariant.price.toString(),
                compareAtPrice: firstVariant.compareAtPrice > 0 ? firstVariant.compareAtPrice.toString() : undefined,
                inventoryPolicy: "CONTINUE", // Track inventory for this variant
              }
            },
          });
          const updateResult = await normalizeAdminGraphqlResult(updateRaw, pfx);
          if (updateResult?.data?.productVariantUpdate?.userErrors?.length > 0) {
            console.error(`${pfx} Variant update errors:`, updateResult.data.productVariantUpdate.userErrors);
          } else {
            console.log(`${pfx} Variant price updated successfully`);
          }
        } catch (updateError) {
          console.error(`${pfx} Failed to update variant price:`, updateError);
        }
      }
    }

    console.log(`${pfx} Product and variants created/updated successfully!`);

    // Step 2.5: Enable inventory tracking at product level
    try {
      console.log(`${pfx} Step 2.5: Enabling inventory tracking at product level...`);
      
      const updateProductMutation = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id tracksInventory }
            userErrors { field message }
          }
        }
      `;
      
      // Try to enable inventory tracking - but this might not be supported in ProductInput
      // Instead, we'll enable it at variant level via inventoryActivate
      console.log(`${pfx} Product-level inventory tracking will be enabled via variant activation`);
    } catch (e) {
      // Ignore - we'll handle at variant level
    }

    // Step 3: Set inventory quantities
    // Get all variants with their inventory items, then set quantities
    try {
      console.log(`${pfx} Step 3: Setting inventory quantities...`);
      
      // First, get the product with all variants and inventory items
      const productQuery = `
        query getProductVariants($productId: ID!) {
          product(id: $productId) {
            variants(first: 10) {
              nodes {
                id
                title
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          }
        }
      `;
      
      const productRaw = await admin.graphql(productQuery, {
        variables: { productId },
      });
      const productResult = await normalizeAdminGraphqlResult(productRaw, pfx);
      const variants = productResult?.data?.product?.variants?.nodes || [];
      
      if (variants.length > 0) {
        // Get all locations (prioritize SHOP type locations)
        const locationQuery = `
          query {
            locations(first: 10) {
              nodes {
                id
                name
                locationType
                isActive
              }
            }
          }
        `;
        
        const locationRaw = await admin.graphql(locationQuery);
        const locationResult = await normalizeAdminGraphqlResult(locationRaw, pfx);
        const allLocations = locationResult?.data?.locations?.nodes || [];
        
        // Find shop location (locationType: SHOP) or use first active location
        const shopLocation = allLocations.find((loc: any) => 
          loc.locationType === "SHOP" && loc.isActive
        ) || allLocations.find((loc: any) => loc.isActive) || allLocations[0];
        
        if (shopLocation) {
          console.log(`${pfx} Setting inventory at location: ${shopLocation.name} (${shopLocation.id}, type: ${shopLocation.locationType || 'unknown'})`);
          
          for (const variant of variants) {
            if (!variant.inventoryItem?.id) {
              console.log(`${pfx} No inventoryItem for variant ${variant.title}, skipping`);
              continue;
            }
            
            const inventoryItemId = variant.inventoryItem.id;
            // Generate random inventory (50-200 units)
            const randomInventory = Math.floor(Math.random() * 151) + 50;
            
            console.log(`${pfx} Processing inventory for ${variant.title} (item: ${inventoryItemId})...`);
            
            // Step 3a: First, activate inventory tracking for this item at this location
            const activateMutation = `
              mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
                inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
                  inventoryLevel {
                    id
                    quantities(names: ["available"]) {
                      name
                      quantity
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;
            
            let activationSuccess = false;
            try {
              const activateRaw = await admin.graphql(activateMutation, {
                variables: {
                  inventoryItemId,
                  locationId: shopLocation.id,
                },
              });
              const activateResult = await normalizeAdminGraphqlResult(activateRaw, pfx);
              
              if (activateResult?.data?.inventoryActivate?.userErrors?.length > 0) {
                const errors = activateResult.data.inventoryActivate.userErrors;
                // Check if error is because already activated
                const isAlreadyActive = errors.some((e: any) => 
                  e.message?.toLowerCase().includes('already') ||
                  e.message?.toLowerCase().includes('activated')
                );
                if (isAlreadyActive) {
                  console.log(`${pfx} Inventory already activated for ${variant.title}`);
                  activationSuccess = true;
                } else {
                  console.error(`${pfx} Inventory activation error for ${variant.title}:`, errors);
                }
              } else if (activateResult?.data?.inventoryActivate?.inventoryLevel) {
                activationSuccess = true;
                console.log(`${pfx} Successfully activated inventory for ${variant.title}`);
              }
            } catch (activateError: any) {
              const errorMsg = activateError?.message || String(activateError);
              if (errorMsg.includes('already') || errorMsg.includes('activated')) {
                console.log(`${pfx} Inventory already activated for ${variant.title}`);
                activationSuccess = true;
              } else {
                console.error(`${pfx} Failed to activate inventory for ${variant.title}:`, activateError);
              }
            }
            
            // Step 3b: Set the inventory quantity (only if activation succeeded or was already active)
            if (activationSuccess) {
              // Delay to ensure activation is fully processed by Shopify
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const inventoryMutation = `
                mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
                  inventorySetOnHandQuantities(input: $input) {
                    inventoryAdjustmentGroup {
                      reason
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `;
              
              try {
                const inventoryRaw = await admin.graphql(inventoryMutation, {
                  variables: {
                    input: {
                      reason: "correction",
                      setQuantities: [{
                        inventoryItemId,
                        locationId: shopLocation.id,
                        quantity: randomInventory,
                      }],
                    },
                  },
                });
                const inventoryResult = await normalizeAdminGraphqlResult(inventoryRaw, pfx);
                
                if (inventoryResult?.data?.inventorySetOnHandQuantities?.userErrors?.length > 0) {
                  const errors = inventoryResult.data.inventorySetOnHandQuantities.userErrors;
                  console.error(`${pfx} Inventory quantity error for ${variant.title}:`, errors);
                } else {
                  console.log(`${pfx} ✅ Successfully set inventory for ${variant.title}: ${randomInventory} units at ${shopLocation.name}`);
                }
              } catch (invError) {
                console.error(`${pfx} Failed to set inventory quantity for ${variant.title}:`, invError);
              }
            } else {
              console.warn(`${pfx} Skipping quantity set for ${variant.title} - activation failed`);
            }
          }
        } else {
          console.log(`${pfx} No location found (checked ${allLocations.length} locations), skipping inventory setup`);
        }
      }
    } catch (inventoryError) {
      console.error(`${pfx} Failed to set inventory:`, inventoryError);
      // Don't fail - product was created successfully
    }

    // Step 4: Add images if provided
    if (imageUrls && imageUrls.length > 0) {
      console.log(`${pfx} Step 4: Adding ${imageUrls.length} image(s) to product...`);
      
      const mediaMutation = `
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media {
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;
      
      const mediaInput = imageUrls
        .filter((url) => url && url.trim())
        .map((url) => ({
          originalSource: url.trim(),
          mediaContentType: "IMAGE",
        }));
      
      try {
        const mediaRaw = await admin.graphql(mediaMutation, {
          variables: { productId, media: mediaInput },
        });
        const mediaResult = await normalizeAdminGraphqlResult(mediaRaw, pfx);
        
        if (mediaResult?.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
          const errors = mediaResult.data.productCreateMedia.mediaUserErrors;
          console.error(`${pfx} Media upload errors:`, JSON.stringify(errors, null, 2));
          // Don't fail - product was created successfully, just images weren't added
        } else {
          console.log(`${pfx} Images added successfully!`);
        }
      } catch (mediaError) {
        console.error(`${pfx} Failed to add images:`, mediaError);
        // Don't fail - product was created successfully
      }
    }

    // Step 5: Publish product to Online Store
    try {
      console.log(`${pfx} Step 5: Publishing product to Online Store...`);
      
      // First, get the Online Store publication
      const publicationsQuery = `
        query {
          publications(first: 10) {
            nodes {
              id
              name
            }
          }
        }
      `;
      
      const publicationsRaw = await admin.graphql(publicationsQuery);
      const publicationsResult = await normalizeAdminGraphqlResult(publicationsRaw, pfx);
      const publications = publicationsResult?.data?.publications?.nodes || [];
      
      // Find Online Store publication
      const onlineStorePub = publications.find((pub: any) => 
        pub.name?.toLowerCase().includes('online store') ||
        pub.name?.toLowerCase().includes('在线商店') ||
        pub.name === 'Online Store'
      ) || publications.find((pub: any) => pub.name?.toLowerCase().includes('online'));
      
      if (onlineStorePub) {
        console.log(`${pfx} Found publication: ${onlineStorePub.name} (${onlineStorePub.id})`);
        
        // Publish product to this publication
        const publishMutation = `
          mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              publishable {
                ... on Product {
                  id
                  publishedAt
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        
        try {
          const publishRaw = await admin.graphql(publishMutation, {
            variables: {
              id: productId,
              input: [{
                publicationId: onlineStorePub.id,
              }],
            },
          });
          const publishResult = await normalizeAdminGraphqlResult(publishRaw, pfx);
          
          if (publishResult?.data?.publishablePublish?.userErrors?.length > 0) {
            const errors = publishResult.data.publishablePublish.userErrors;
            console.error(`${pfx} Publication errors:`, errors);
          } else {
            console.log(`${pfx} ✅ Successfully published product to ${onlineStorePub.name}`);
          }
        } catch (publishError) {
          console.error(`${pfx} Failed to publish product:`, publishError);
          // Don't fail - product was created successfully
        }
      } else {
        console.log(`${pfx} Online Store publication not found (checked ${publications.length} publications)`);
        // Try alternative: use productPublishToCurrentChannel
        try {
          const altPublishMutation = `
            mutation productPublishToCurrentChannel($id: ID!) {
              productPublishToCurrentChannel(id: $id) {
                product {
                  id
                  publishedAt
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          
          const altPublishRaw = await admin.graphql(altPublishMutation, {
            variables: { id: productId },
          });
          const altPublishResult = await normalizeAdminGraphqlResult(altPublishRaw, pfx);
          
          if (altPublishResult?.data?.productPublishToCurrentChannel?.userErrors?.length > 0) {
            console.error(`${pfx} Alternative publication errors:`, altPublishResult.data.productPublishToCurrentChannel.userErrors);
          } else {
            console.log(`${pfx} ✅ Successfully published product using productPublishToCurrentChannel`);
          }
        } catch (altPublishError) {
          console.error(`${pfx} Alternative publication also failed:`, altPublishError);
        }
      }
    } catch (publishError) {
      console.error(`${pfx} Failed to publish product:`, publishError);
      // Don't fail - product was created successfully
    }

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
function buildProductCreateInputForProductCreate(
  product: GeneratedProduct, 
  imageUrls?: string[],
  brandName?: string,
  productType?: string
) {
  const sizeValues = uniqueSizes(product);
  const input: any = {
    title: product.title,
  };
  
  // Only set vendor if brand name is provided
  if (brandName && brandName.trim()) {
    input.vendor = brandName.trim();
  }
  
  // Only set productType if provided
  if (productType && productType.trim()) {
    input.productType = productType.trim();
  }

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

  // Images are added separately after product creation using productCreateMedia mutation
  // (productCreate doesn't reliably support media field across all API versions)
  void imageUrls;

  return input;
}

function buildProductCreateInputForProductCreateAltValues(
  product: GeneratedProduct, 
  imageUrls?: string[],
  brandName?: string,
  productType?: string
) {
  // Same as buildProductCreateInputForProductCreate
  return buildProductCreateInputForProductCreate(product, imageUrls, brandName, productType);
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


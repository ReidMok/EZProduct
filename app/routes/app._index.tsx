/**
 * Main App Route - Product Generation Interface
 */

import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation, Form, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Page,
  LegacyCard,
  TextField,
  Button,
  Banner,
  Spinner,
  InlineStack,
  Text,
  BlockStack,
} from "@shopify/polaris";
import shopify from "../shopify.server";
import { generateProduct } from "../utils/ai.generator";
import { createShopifyProduct } from "../utils/shopify.sync";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Log all requests to /app route
  const url = new URL(request.url);
  console.log(`[App Loader] ${request.method} ${url.pathname}${url.search}`);
  console.log(`[App Loader] Full URL: ${request.url}`);
  console.log(`[App Loader] Headers:`, Object.fromEntries(request.headers.entries()));

  // Vercel bots (e.g. vercel-favicon) may hit /app without Shopify embedded params.
  // Shopify auth will respond with 410 for these, polluting logs. Short-circuit them.
  const hasEmbeddedParams =
    url.searchParams.has("embedded") ||
    url.searchParams.has("shop") ||
    url.searchParams.has("host") ||
    url.searchParams.has("hmac");
  if (!hasEmbeddedParams) {
    console.log("[App Loader] Missing Shopify embedded params; returning 204 to avoid auth/410 noise.");
    return new Response(null, { status: 204 });
  }
  
  // shopify.authenticate.admin may throw a Response (redirect) if authentication is needed
  // We need to let it throw, not catch it
  // If it throws a Response, it's a redirect to OAuth login, let it through
  try {
    console.log(`[App Loader] Calling shopify.authenticate.admin...`);
    const { session } = await shopify.authenticate.admin(request);
    console.log(`[App Loader] Successfully authenticated. Shop: ${session.shop}`);
    const url = new URL(request.url);
    const result = url.searchParams.get("result");
    const productId = url.searchParams.get("productId");
    const message = url.searchParams.get("message");
    return json({ shop: session.shop, result, productId, message });
  } catch (error) {
    // If Shopify auth needs to redirect (or returns an HTML "exit-iframe" response),
    // DO NOT `throw` it here. Returning preserves Shopify's intended behavior and avoids Remix
    // treating a 200 HTML body as an ErrorResponse on the client.
    if (error instanceof Response) {
      console.log(
        `[App Loader] Returning auth Response. Status: ${error.status} ${error.statusText} Location: ${
          error.headers.get("Location") || "n/a"
        }`
      );
      const location = error.headers.get("location") || error.headers.get("Location");
      if (location && [301, 302, 303, 307, 308].includes(error.status)) {
        console.log(`[App Loader] Converting auth redirect Response into Remix redirect(${location})`);
        return redirect(location);
      }
      return error;
    }
    // Log other errors for debugging
    console.error("[App Loader] Error:", error);
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const debugId = Math.random().toString(36).slice(2, 10);
  console.log("[App Action] ========== ACTION STARTED ==========");
  console.log("[App Action] debugId:", debugId);
  console.log("[App Action] Request URL:", request.url);
  console.log("[App Action] Request Method:", request.method);
  
  // Store variables in outer scope so catch block can access them
  let session: any = null;
  let admin: any = null;
  let keywords: string = "";
  let imageUrl: string | null = null;
  
  try {
    // shopify.authenticate.admin may throw a Response (redirect) if authentication is needed
    // We need to let it throw, not catch it, so the OAuth flow can continue
    const authResult = await shopify.authenticate.admin(request);
    
    // If we get here, authentication succeeded
    session = authResult.session;
    admin = authResult.admin;
    
    console.log("[App Action] Authentication successful. Shop:", session.shop);
    console.log("[App Action] Admin object available:", !!admin);
    console.log("[App Action] Admin.graphql available:", !!(admin && admin.graphql));
    
    const formData = await request.formData();
    keywords = (formData.get("keywords") as string) || "";
    imageUrl = formData.get("imageUrl") as string | null;

    console.log("[App Action] Form data received. Keywords:", keywords?.substring(0, 50) + "...");

    if (!keywords || keywords.trim() === "") {
      console.log("[App Action] No keywords provided. Redirecting with error.");
      return redirect(`/app?result=error&message=${encodeURIComponent("Please enter product keywords")}`);
    }

    console.log("[App Action] Starting product generation...");
    
    // Step 1: Generate product using AI
    console.log("[App Action] Step 1: Generating product with AI...");
    const generatedProduct = await generateProduct(keywords.trim(), imageUrl || undefined);
    console.log("[App Action] AI generation completed. Title:", generatedProduct.title);

    // Step 2: Sync to Shopify
    console.log("[App Action] Step 2: Syncing to Shopify...");
    console.log("[App Action] Admin object before createShopifyProduct:", {
      hasAdmin: !!admin,
      hasGraphql: !!(admin && admin.graphql),
      adminKeys: admin ? Object.keys(admin) : [],
    });
    
    // Test admin.graphql directly to see if it works
    // IMPORTANT: If this returns a Response (302 redirect), it means embedded session token needs refresh
    // We should let it through immediately, not continue with product creation
    console.log("[App Action] Testing admin.graphql with a simple query...");
    try {
      const testQuery = `query { shop { name } }`;
      const testResponse = await admin.graphql(testQuery);
      console.log("[App Action] Test query response type:", typeof testResponse);
      console.log("[App Action] Test query response keys:", testResponse ? Object.keys(testResponse) : 'null');
      if (testResponse && typeof testResponse === 'object' && 'status' in testResponse) {
        const response = testResponse as Response;
        console.error("[App Action] Test query returned Response object (redirect)! Status:", response.status);
        console.error("[App Action] Test query Response headers:", Object.fromEntries(response.headers.entries()));
        const location = response.headers.get('location');
        if (location && location.includes('/auth/exit-iframe')) {
          console.log("[App Action] Embedded session token needs refresh. Returning redirect to /auth/exit-iframe");
          // Return the Response directly so browser can execute exit-iframe script and refresh token
          return response;
        }
      } else {
        console.log("[App Action] Test query succeeded! Response:", JSON.stringify(testResponse, null, 2).substring(0, 200));
      }
    } catch (testError: any) {
      // If testError is a Response (redirect), return it immediately
      if (testError instanceof Response) {
        const location = testError.headers.get('location');
        if (location && location.includes('/auth/exit-iframe')) {
          console.log("[App Action] Test query threw Response (redirect) for token refresh. Returning it.");
          return testError;
        }
      }
      console.error("[App Action] Test query failed:", testError);
    }
    
    const shopifyResult = await createShopifyProduct(generatedProduct, {
      shop: session.shop,
      accessToken: session.accessToken!,
      session: session, // Pass the actual Session instance
      admin: admin, // Pass the admin object from Shopify App Remix
      debugId,
    });
    console.log("[App Action] Shopify sync completed. Product ID:", shopifyResult.productId);
    console.log("[App Action] Product Handle:", shopifyResult.productHandle);

    // Step 3: Save to database
    console.log("[App Action] Step 3: Saving to database...");
    const shopRecord = await prisma.shop.upsert({
      where: { shop: session.shop },
      update: {
        accessToken: session.accessToken!,
        scope: session.scope ?? "",
      },
      create: {
        shop: session.shop,
        accessToken: session.accessToken!,
        scope: session.scope ?? "",
      },
    });

    await prisma.productGeneration.create({
      data: {
        shopId: shopRecord.id,
        keywords: keywords.trim(),
        imageUrl: imageUrl || null,
        title: generatedProduct.title,
        descriptionHtml: generatedProduct.descriptionHtml,
        tags: generatedProduct.tags.join(", "),
        seoTitle: generatedProduct.seoTitle || null,
        seoDescription: generatedProduct.seoDescription || null,
        variantsJson: JSON.stringify(generatedProduct.variants),
        shopifyProductId: shopifyResult.productId,
        shopifyProductHandle: shopifyResult.productHandle,
        status: "synced",
      },
    });
    console.log("[App Action] Database save completed.");

    // PRG pattern: redirect back to /app so Shopify iframe won't show raw JSON or a blank "200" page
    const redirectUrl = `/app?result=success&productId=${encodeURIComponent(shopifyResult.productId)}&message=${encodeURIComponent(
      "Product generated and synced successfully!"
    )}`;
    console.log("[App Action] Redirecting to:", redirectUrl);
    console.log("[App Action] ========== ACTION COMPLETED SUCCESSFULLY ==========");
    return redirect(redirectUrl);
  } catch (error) {
    // Shopify auth may throw a Response (302 redirect) OR a 200 HTML "exit-iframe" response.
    // For embedded apps, we must RETURN it so the browser executes the script / follows the redirect.
    // Throwing can make Remix treat it as an ErrorResponse, which is what you're seeing in the console.
    if (error instanceof Response) {
      console.log("[App Action] Received Response (redirect) from Shopify API");
      console.log("[App Action] Response Status:", error.status);
      const location = error.headers.get("location") || error.headers.get("Location");
      console.log("[App Action] Response Location:", location);
      
      // If it's a redirect to /auth/exit-iframe, return the Response directly
      // This allows the browser to execute the exit-iframe script and refresh the embedded session token
      if (location && location.includes('/auth/exit-iframe')) {
        console.log("[App Action] Embedded session token needs refresh. Returning Response directly for browser to handle.");
        // Return the Response as-is so browser can execute exit-iframe script
        // With reloadDocument on Form, browser will follow this redirect properly
        return error;
      }
      
      // For other redirects, convert to Remix redirect
      if (location && [301, 302, 303, 307, 308].includes(error.status)) {
        console.log(`[App Action] Converting auth redirect Response into Remix redirect(${location})`);
        return redirect(location);
      }
      return error;
    }
    
    console.error("[App Action] ========== ERROR OCCURRED ==========");
    console.error("[App Action] debugId:", debugId);
    console.error("[App Action] Error occurred:", error);
    console.error("[App Action] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[App Action] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[App Action] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Extract error message for user display
    let errorMessage = "Failed to generate product";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorMessageForUrl =
      errorMessage.length > 180 ? errorMessage.substring(0, 180) + "..." : errorMessage;
    const errorMessageForDb =
      errorMessage.length > 4000 ? errorMessage.substring(0, 4000) + "..." : errorMessage;

    // Try to save failed attempt to database (only if we have session and keywords)
    // Note: session and keywords are already available in outer scope
    try {
      if (session && keywords) {
        const shopRecord = await prisma.shop.upsert({
          where: { shop: session.shop },
          update: {
            accessToken: session.accessToken!,
            scope: session.scope ?? "",
          },
          create: {
            shop: session.shop,
            accessToken: session.accessToken!,
            scope: session.scope ?? "",
          },
        });

        await prisma.productGeneration.create({
          data: {
            shopId: shopRecord.id,
            keywords: keywords.trim() || "N/A",
            imageUrl: imageUrl || null,
            title: keywords.trim() || "N/A", // Required field - use keywords as fallback
            descriptionHtml: "<p>Failed to generate</p>", // Required field - minimal HTML
            tags: "", // Required field - empty string
            variantsJson: "[]", // Required field - empty array
            status: "failed",
            errorMessage: `[debugId=${debugId}] ${errorMessageForDb}`,
          },
        });
        console.log("[App Action] Failed attempt saved to database.");
      }
    } catch (dbError) {
      console.error("[App Action] Failed to save error to database:", dbError);
      // Continue - don't fail the entire request if DB save fails
    }

    // Always return a redirect, even if error logging failed
    const redirectUrl = `/app?result=error&message=${encodeURIComponent(
      `失败（debugId=${debugId}）：${errorMessageForUrl}`
    )}`;
    console.log("[App Action] Redirecting with error to:", redirectUrl);
    console.log("[App Action] ========== ACTION COMPLETED WITH ERROR ==========");
    return redirect(redirectUrl);
  }
};

export default function Index() {
  const { shop, result, productId, message } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const [keywords, setKeywords] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Debug: Log form submission state
  useEffect(() => {
    console.log("[App UI] Navigation state changed:", navigation.state);
    console.log("[App UI] isSubmitting:", isSubmitting);
    if (navigation.state === "submitting") {
      console.log("[App UI] Form is submitting...");
    }
  }, [navigation.state, isSubmitting]);

  // Clear URL search params after displaying message (optional, for cleaner URLs)
  useEffect(() => {
    if (result || message) {
      const timer = setTimeout(() => {
        // Only clear if not currently submitting
        if (navigation.state === "idle") {
          setSearchParams({}, { replace: true });
        }
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [result, message, navigation.state, setSearchParams]);

  return (
    <Page
      title="EZProduct - AI Product Generator"
      subtitle="Generate complete product listings with AI and sync to your store"
    >
      <BlockStack gap="500">
        {result === "error" && message && (
          <Banner status="critical" title="Error">
            <p>{message}</p>
          </Banner>
        )}

        {result === "success" && (
          <Banner
            status="success"
            title="Success!"
            action={
              productId
                ? {
                    content: "View Product",
                    url: `https://${shop}/admin/products/${productId.replace("gid://shopify/Product/", "")}`,
                    external: true,
                  }
                : undefined
            }
          >
            <p>{message || "Product generated and synced successfully!"}</p>
          </Banner>
        )}

        <LegacyCard sectioned title="Generate New Product">
          {/* Force a document POST so Shopify's exit-iframe HTML/redirect can execute properly.
              Remix fetch-navigation can treat that HTML as data and show a blank "200" view. */}
          <Form
            method="post"
            reloadDocument
            onSubmit={(e) => {
              console.log("[App UI] Form onSubmit triggered!");
              console.log("[App UI] Keywords:", keywords);
              console.log("[App UI] ImageUrl:", imageUrl);
              console.log("[App UI] Form data:", new FormData(e.currentTarget));
              // Don't prevent default - let Remix handle it
            }}
          >
            <BlockStack gap="loose">
              <TextField
                label="Product Keywords"
                name="keywords"
                type="text"
                value={keywords}
                onChange={(value) => {
                  console.log("[App UI] Keywords changed:", value);
                  setKeywords(value);
                }}
                placeholder="e.g., Ceramic Coffee Mug, Yoga Mat, Pet Collar"
                helpText="Enter keywords describing your product. AI will generate title, description, variants, and SEO metadata."
                autoComplete="off"
                disabled={isSubmitting}
              />

              <TextField
                label="Product Image URL (Optional)"
                name="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(value) => {
                  console.log("[App UI] ImageUrl changed:", value);
                  setImageUrl(value);
                }}
                placeholder="https://example.com/product-image.jpg"
                helpText="Optional: Provide an image URL for AI to analyze and incorporate into the description."
                autoComplete="off"
                disabled={isSubmitting}
              />

              <Button
                submit
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                onClick={() => {
                  console.log("[App UI] Button clicked!");
                  console.log("[App UI] Current keywords:", keywords);
                  console.log("[App UI] Current imageUrl:", imageUrl);
                  console.log("[App UI] isSubmitting:", isSubmitting);
                }}
              >
                {isSubmitting ? (
                  <InlineStack align="center" gap="tight">
                    <Spinner size="small" />
                    <Text as="span">Generating...</Text>
                  </InlineStack>
                ) : (
                  "Generate & Sync Product"
                )}
              </Button>
            </BlockStack>
          </Form>
        </LegacyCard>

        <LegacyCard sectioned title="How It Works">
          <BlockStack gap="300">
            <Text as="p">
                  <strong>1. Enter Keywords:</strong> Describe your product (e.g., "Minimalist Ceramic Coffee Mug")
            </Text>
            <Text as="p">
              <strong>2. AI Generation:</strong> Our AI creates a complete product listing including:
            </Text>
            <ul>
              <li>SEO-optimized title and description</li>
              <li>3 size variants (6", 8", 10") with cm/inch conversion table</li>
              <li>Pricing and SKU generation</li>
              <li>Relevant tags and SEO metadata</li>
            </ul>
            <Text as="p">
              <strong>3. Auto-Sync:</strong> Product is automatically created in your Shopify store
            </Text>
          </BlockStack>
        </LegacyCard>
      </BlockStack>
    </Page>
  );
}


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
      return error;
    }
    // Log other errors for debugging
    console.error("[App Loader] Error:", error);
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("[App Action] ========== ACTION STARTED ==========");
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
    console.log("[App Action] Testing admin.graphql with a simple query...");
    try {
      const testQuery = `query { shop { name } }`;
      const testResponse = await admin.graphql(testQuery);
      console.log("[App Action] Test query response type:", typeof testResponse);
      console.log("[App Action] Test query response keys:", testResponse ? Object.keys(testResponse) : 'null');
      if (testResponse && typeof testResponse === 'object' && 'status' in testResponse) {
        console.error("[App Action] Test query returned Response object (redirect)! Status:", (testResponse as Response).status);
        console.error("[App Action] Test query Response headers:", Object.fromEntries((testResponse as Response).headers.entries()));
      } else {
        console.log("[App Action] Test query succeeded! Response:", JSON.stringify(testResponse, null, 2).substring(0, 200));
      }
    } catch (testError: any) {
      console.error("[App Action] Test query failed:", testError);
    }
    
    const shopifyResult = await createShopifyProduct(generatedProduct, {
      shop: session.shop,
      accessToken: session.accessToken!,
      session: session, // Pass the actual Session instance
      admin: admin, // Pass the admin object from Shopify App Remix
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
      console.log("[App Action] Returning auth Response from shopify.authenticate.admin");
      console.log("[App Action] Response Status:", error.status);
      console.log("[App Action] Response Location:", error.headers.get("location"));
      return error;
    }
    
    console.error("[App Action] ========== ERROR OCCURRED ==========");
    console.error("[App Action] Error occurred:", error);
    console.error("[App Action] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[App Action] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[App Action] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Extract error message for user display
    let errorMessage = "Failed to generate product";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Truncate very long error messages
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
    }

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
            errorMessage: errorMessage,
          },
        });
        console.log("[App Action] Failed attempt saved to database.");
      }
    } catch (dbError) {
      console.error("[App Action] Failed to save error to database:", dbError);
      // Continue - don't fail the entire request if DB save fails
    }

    // Always return a redirect, even if error logging failed
    const redirectUrl = `/app?result=error&message=${encodeURIComponent(errorMessage)}`;
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
          <Form method="post">
            <BlockStack gap="loose">
              <TextField
                label="Product Keywords"
                name="keywords"
                type="text"
                value={keywords}
                onChange={setKeywords}
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
                onChange={setImageUrl}
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


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
  console.log(`[App Loader] Request Method: ${request.method}`);
  console.log(`[App Loader] Content-Type: ${request.headers.get("content-type")}`);
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
  // Check if session was just refreshed (cookie set by action)
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionRefreshed = cookieHeader.includes("session_refreshed=1");
  if (sessionRefreshed) {
    console.log("[App Loader] Session was just refreshed (detected cookie)");
  }

  try {
    console.log(`[App Loader] Calling shopify.authenticate.admin...`);
    const { session } = await shopify.authenticate.admin(request);
    console.log(`[App Loader] Successfully authenticated. Shop: ${session.shop}`);
    const url = new URL(request.url);
    const result = url.searchParams.get("result");
    const productId = url.searchParams.get("productId");
    const message = url.searchParams.get("message");
    
    // If session was refreshed, clear the cookie and add flag to response
    if (sessionRefreshed) {
      return json(
        { shop: session.shop, result, productId, message, sessionRefreshed: true },
        {
          headers: {
            "Set-Cookie": "session_refreshed=; Path=/; Max-Age=0; SameSite=Lax",
          },
        }
      );
    }
    
    return json({ shop: session.shop, result, productId, message, sessionRefreshed: false });
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
  console.log("[App Action] Content-Type:", request.headers.get("content-type"));
  console.log("[App Action] All Headers:", Object.fromEntries(request.headers.entries()));
  
  // Log request body if it exists
  try {
    const clonedRequest = request.clone();
    const text = await clonedRequest.text();
    console.log("[App Action] Request body (first 500 chars):", text.substring(0, 500));
  } catch (e) {
    console.log("[App Action] Could not read request body:", e);
  }
  
  // Store variables in outer scope so catch block can access them
  let session: any = null;
  let admin: any = null;
  let keywords: string = "";
  let imageUrl: string | null = null;

  const buildEmbeddedRedirectUrl = (updates: Record<string, string | null | undefined>) => {
    const url = new URL(request.url);
    // These can be huge and are not needed after the POST; keeping them makes URLs brittle
    url.searchParams.delete("id_token");

    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === undefined || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }

    return `${url.pathname}?${url.searchParams.toString()}`;
  };
  
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
      return redirect(
        buildEmbeddedRedirectUrl({
          result: "error",
          message: "Please enter product keywords",
          productId: null,
        })
      );
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
    
    // Skip the test query - it was causing false positives for auth flow detection
    // admin.graphql returns a Response object that needs to be parsed, not returned to browser
    // The actual product creation will handle any auth issues properly
    
    // Pass imageUrl as imageUrls array if provided
    const imageUrls = imageUrl && imageUrl.trim() ? [imageUrl.trim()] : undefined;
    
    const shopifyResult = await createShopifyProduct(generatedProduct, {
      shop: session.shop,
      accessToken: session.accessToken!,
      session: session, // Pass the actual Session instance
      admin: admin, // Pass the admin object from Shopify App Remix
      debugId,
      imageUrls,
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
    const redirectUrl = buildEmbeddedRedirectUrl({
      result: "success",
      productId: shopifyResult.productId,
      message: "Product generated and synced successfully!",
    });
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
      
      // If it's a redirect to /auth/exit-iframe or /auth/session-token, the session needs refresh
      // Set a cookie so we can show a friendly message after the refresh completes
      if (location && (location.includes('/auth/exit-iframe') || location.includes('/auth/session-token'))) {
        console.log("[App Action] Session token needs refresh. Setting cookie and redirecting.");
        // Set cookie to show message after refresh, then redirect
        return redirect(location, {
          headers: {
            "Set-Cookie": "session_refreshed=1; Path=/; Max-Age=30; SameSite=Lax",
          },
        });
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
    const redirectUrl = buildEmbeddedRedirectUrl({
      result: "error",
      message: `失败（debugId=${debugId}）：${errorMessageForUrl}`,
      productId: null,
    });
    console.log("[App Action] Redirecting with error to:", redirectUrl);
    console.log("[App Action] ========== ACTION COMPLETED WITH ERROR ==========");
    return redirect(redirectUrl);
  }
};

export default function Index() {
  const { shop, result, productId, message, sessionRefreshed } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const [documentSubmitting, setDocumentSubmitting] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Restore form data from localStorage after session refresh
  useEffect(() => {
    console.log("[App UI] === VERSION 3.0 LOADED ===");
    
    // If session was refreshed, restore form data from localStorage
    if (sessionRefreshed) {
      console.log("[App UI] Session was refreshed, restoring form data from localStorage");
      try {
        const savedKeywords = localStorage.getItem("ezproduct_keywords");
        const savedImageUrl = localStorage.getItem("ezproduct_imageUrl");
        if (savedKeywords) {
          console.log("[App UI] Restored keywords:", savedKeywords);
          setKeywords(savedKeywords);
        }
        if (savedImageUrl) {
          console.log("[App UI] Restored imageUrl:", savedImageUrl);
          setImageUrl(savedImageUrl);
        }
      } catch (e) {
        console.error("[App UI] Failed to restore form data:", e);
      }
    }
    
    // Clear localStorage if we have a result (success or error)
    if (result) {
      console.log("[App UI] Clearing localStorage (have result)");
      try {
        localStorage.removeItem("ezproduct_keywords");
        localStorage.removeItem("ezproduct_imageUrl");
      } catch (e) {
        // Ignore
      }
    }
  }, [sessionRefreshed, result]);

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
          const next = new URLSearchParams(searchParams);
          next.delete("result");
          next.delete("message");
          next.delete("productId");
          setSearchParams(next, { replace: true });
        }
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [result, message, navigation.state, setSearchParams, searchParams]);

  return (
    <Page
      title="EZProduct - AI Product Generator"
      subtitle="Generate complete product listings with AI and sync to your store"
    >
      <BlockStack gap="500">
        {sessionRefreshed && !result && (
          <Banner tone="warning" title="会话已刷新 / Session Refreshed">
            <p>您的会话令牌已刷新。请重新点击"Generate & Sync Product"按钮生成产品。</p>
            <p>Your session token has been refreshed. Please click the button again to generate your product.</p>
          </Banner>
        )}

        {result === "error" && message && (
          <Banner tone="critical" title="Error">
            <p>{message}</p>
          </Banner>
        )}

        {result === "success" && (
          <Banner
            tone="success"
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
              setDocumentSubmitting(true);
              console.log("[App UI] Form onSubmit triggered! (v3.0)");
              console.log("[App UI] Keywords state:", keywords);
              console.log("[App UI] ImageUrl state:", imageUrl);
              
              // Save form data to localStorage in case session needs refresh
              try {
                localStorage.setItem("ezproduct_keywords", keywords);
                localStorage.setItem("ezproduct_imageUrl", imageUrl);
                console.log("[App UI] Saved form data to localStorage");
              } catch (err) {
                console.error("[App UI] Failed to save to localStorage:", err);
              }
              
              // Debug: Check hidden inputs directly
              const form = e.currentTarget;
              const hiddenKeywords = form.querySelector('input[name="keywords"]') as HTMLInputElement;
              const hiddenImageUrl = form.querySelector('input[name="imageUrl"]') as HTMLInputElement;
              console.log("[App UI] Hidden keywords input value:", hiddenKeywords?.value);
              console.log("[App UI] Hidden imageUrl input value:", hiddenImageUrl?.value);
              
              const formData = new FormData(form);
              console.log("[App UI] FormData entries:");
              for (const [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
              }
              // Don't prevent default - let browser submit
            }}
          >
            {/* Hidden inputs to ensure values are submitted with reloadDocument.
                Polaris TextField doesn't always sync to native form fields. */}
            <input type="hidden" name="keywords" value={keywords} />
            <input type="hidden" name="imageUrl" value={imageUrl} />

            <BlockStack gap="400">
              <TextField
                label="Product Keywords"
                type="text"
                value={keywords}
                onChange={(value) => {
                  console.log("[App UI] Keywords changed:", value);
                  setKeywords(value);
                }}
                placeholder="e.g., Ceramic Coffee Mug, Yoga Mat, Pet Collar"
                helpText="Enter keywords describing your product. AI will generate title, description, variants, and SEO metadata."
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <TextField
                label="Product Image URL (Optional)"
                type="url"
                value={imageUrl}
                onChange={(value) => {
                  console.log("[App UI] ImageUrl changed:", value);
                  setImageUrl(value);
                }}
                placeholder="https://example.com/product-image.jpg"
                helpText="Optional: Provide an image URL for AI to analyze and incorporate into the description."
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <Button
                submit
                variant="primary"
                loading={isSubmitting || documentSubmitting}
                disabled={isSubmitting || documentSubmitting}
                onClick={() => {
                  console.log("[App UI] Button clicked!");
                  console.log("[App UI] Current keywords:", keywords);
                  console.log("[App UI] Current imageUrl:", imageUrl);
                  console.log("[App UI] isSubmitting:", isSubmitting);
                }}
              >
                {isSubmitting || documentSubmitting ? "Generating..." : "Generate & Sync Product"}
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


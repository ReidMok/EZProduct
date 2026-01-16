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
    // If it's a Response (redirect), let it through - this is the OAuth flow
    if (error instanceof Response) {
      console.log(`[App Loader] Redirecting to OAuth login. Status: ${error.status} ${error.statusText}`);
      console.log(`[App Loader] Redirect location: ${error.headers.get('Location') || 'unknown'}`);
      throw error;
    }
    // Log other errors for debugging
    console.error("[App Loader] Error:", error);
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  const keywords = formData.get("keywords") as string;
  const imageUrl = formData.get("imageUrl") as string | null;

  if (!keywords || keywords.trim() === "") {
    return redirect(`/app?result=error&message=${encodeURIComponent("Please enter product keywords")}`);
  }

  try {
    console.log("[App Action] Starting product generation...");
    
    // Step 1: Generate product using AI
    console.log("[App Action] Step 1: Generating product with AI...");
    const generatedProduct = await generateProduct(keywords.trim(), imageUrl || undefined);
    console.log("[App Action] AI generation completed. Title:", generatedProduct.title);

    // Step 2: Sync to Shopify
    console.log("[App Action] Step 2: Syncing to Shopify...");
    const shopifyResult = await createShopifyProduct(generatedProduct, {
      shop: session.shop,
      accessToken: session.accessToken!,
      session: session, // Pass the actual Session instance
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
    return redirect(redirectUrl);
  } catch (error) {
    console.error("[App Action] Error occurred:", error);
    console.error("[App Action] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Save failed attempt to database
    try {
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
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (dbError) {
      console.error("Failed to save error to database:", dbError);
    }

    return redirect(
      `/app?result=error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Failed to generate product"
      )}`
    );
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


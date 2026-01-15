/**
 * Main App Route - Product Generation Interface
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, Form } from "@remix-run/react";
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
    return json({ shop: session.shop });
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
    return json(
      { error: "Please enter product keywords" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Generate product using AI
    const generatedProduct = await generateProduct(keywords.trim(), imageUrl || undefined);

    // Step 2: Sync to Shopify
    const shopifyResult = await createShopifyProduct(generatedProduct, {
      shop: session.shop,
      accessToken: session.accessToken!,
    });

    // Step 3: Save to database
    await prisma.productGeneration.create({
      data: {
        shopId: session.shop,
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

    return json({
      success: true,
      productId: shopifyResult.productId,
      productHandle: shopifyResult.productHandle,
      message: "Product generated and synced successfully!",
    });
  } catch (error) {
    console.error("Action Error:", error);

    // Save failed attempt to database
    await prisma.productGeneration.create({
      data: {
        shopId: session.shop,
        keywords: keywords.trim(),
        imageUrl: imageUrl || null,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    }).catch((dbError) => {
      console.error("Failed to save error to database:", dbError);
    });

    return json(
      {
        error: error instanceof Error ? error.message : "Failed to generate product",
      },
      { status: 500 }
    );
  }
};

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <Page
      title="EZProduct - AI Product Generator"
      subtitle="Generate complete product listings with AI and sync to your store"
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner status="critical" title="Error">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.success && (
          <Banner
            status="success"
            title="Success!"
            action={{
              content: "View Product",
              url: `https://${shop}/admin/products/${actionData.productId}`,
              external: true,
            }}
          >
            <p>{actionData.message}</p>
          </Banner>
        )}

        <LegacyCard sectioned title="Generate New Product">
          <Form method="post">
            <BlockStack gap="loose">
              <TextField
                label="Product Keywords"
                name="keywords"
                type="text"
                placeholder="e.g., Scuba Diver Resin Lamp, Three Divers Night Light"
                helpText="Enter keywords describing your product. AI will generate title, description, variants, and SEO metadata."
                autoComplete="off"
                disabled={isSubmitting}
              />

              <TextField
                label="Product Image URL (Optional)"
                name="imageUrl"
                type="url"
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
              <strong>1. Enter Keywords:</strong> Describe your product (e.g., "Three Divers Resin Night Light")
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


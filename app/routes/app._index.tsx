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
  InlineStack,
  ButtonGroup,
} from "@shopify/polaris";
import shopify from "../shopify.server";
import { generateProduct } from "../utils/ai.generator";
import { createShopifyProduct } from "../utils/shopify.sync";
import { prisma } from "../db.server";
import { t, getSavedLanguage, saveLanguage, type Language } from "../utils/i18n";
import { generateTemplateCSV, parseCSV, validateRow, type BatchProductRow } from "../utils/csv-template";

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
    const sizeOptions = (formData.get("sizeOptions") as string) || "";
    const brandName = (formData.get("brandName") as string) || "";
    const productNotes = (formData.get("productNotes") as string) || "";

    console.log("[App Action] Form data received:");
    console.log("  - Keywords:", keywords?.substring(0, 50));
    console.log("  - SizeOptions:", sizeOptions);
    console.log("  - BrandName:", brandName);
    console.log("  - ProductNotes:", productNotes?.substring(0, 50));

    if (!keywords || keywords.trim() === "") {
      console.log("[App Action] No keywords provided. Redirecting with error.");
      return redirect(
        buildEmbeddedRedirectUrl({
          result: "error",
          message: "请输入产品关键词 / Please enter product keywords",
          productId: null,
        })
      );
    }

    console.log("[App Action] Starting product generation...");
    
    // Step 1: Generate product using AI
    console.log("[App Action] Step 1: Generating product with AI...");
    const generatedProduct = await generateProduct({
      keywords: keywords.trim(),
      imageUrl: imageUrl || undefined,
      sizeOptions: sizeOptions.trim() || undefined,
      brandName: brandName.trim() || undefined,
      productNotes: productNotes.trim() || undefined,
    });
    console.log("[App Action] AI generation completed. Title:", generatedProduct.title);
    console.log("[App Action] Variants count:", generatedProduct.variants.length);
    console.log("[App Action] Variant sizes:", generatedProduct.variants.map(v => v.size).join(", "));

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
      brandName: brandName.trim() || undefined,
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
  const [sizeOptions, setSizeOptions] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [lang, setLang] = useState<Language>('en');
  
  // Initialize language from localStorage on mount
  useEffect(() => {
    setLang(getSavedLanguage());
  }, []);
  
  // Toggle language handler
  const toggleLanguage = (newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  };
  
  // Batch upload state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResult, setBatchResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateTemplateCSV(lang);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `product_template_${lang}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  // Handle file selection and batch processing
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFileName(file.name);
    setBatchResult(null);
    
    try {
      const content = await file.text();
      const { rows, errors } = parseCSV(content);
      
      if (errors.length > 0) {
        setBatchResult({ success: 0, failed: 0, errors });
        return;
      }
      
      if (rows.length === 0) {
        setBatchResult({ success: 0, failed: 0, errors: [lang === 'zh' ? 'CSV 文件中没有有效数据' : 'No valid data in CSV file'] });
        return;
      }
      
      if (rows.length > 20) {
        setBatchResult({ success: 0, failed: 0, errors: [lang === 'zh' ? '每批最多处理 20 个产品' : 'Maximum 20 products per batch'] });
        return;
      }
      
      // Validate all rows
      const validationErrors: string[] = [];
      rows.forEach(row => {
        validationErrors.push(...validateRow(row));
      });
      
      if (validationErrors.length > 0) {
        setBatchResult({ success: 0, failed: 0, errors: validationErrors });
        return;
      }
      
      // Start batch processing
      setBatchProcessing(true);
      setBatchProgress({ current: 0, total: rows.length });
      
      let successCount = 0;
      let failedCount = 0;
      const processingErrors: string[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setBatchProgress({ current: i + 1, total: rows.length });
        
        try {
          // Create form data and submit
          const formData = new FormData();
          formData.append('keywords', row.keywords);
          if (row.imageUrl) formData.append('imageUrl', row.imageUrl);
          if (row.sizeOptions) formData.append('sizeOptions', row.sizeOptions);
          if (row.brandName) formData.append('brandName', row.brandName);
          if (row.productNotes) formData.append('productNotes', row.productNotes);
          formData.append('batchMode', 'true');
          
          const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok || response.redirected) {
            successCount++;
          } else {
            failedCount++;
            processingErrors.push(`Row ${row.rowNumber}: ${lang === 'zh' ? '处理失败' : 'Processing failed'}`);
          }
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          failedCount++;
          processingErrors.push(`Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      setBatchResult({ success: successCount, failed: failedCount, errors: processingErrors });
    } catch (err) {
      setBatchResult({ success: 0, failed: 0, errors: [err instanceof Error ? err.message : 'Failed to read file'] });
    } finally {
      setBatchProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Restore form data from localStorage after session refresh
  useEffect(() => {
    console.log("[App UI] === VERSION 4.0 LOADED ===");
    
    // If session was refreshed, restore form data from localStorage
    if (sessionRefreshed) {
      console.log("[App UI] Session was refreshed, restoring form data from localStorage");
      try {
        const savedKeywords = localStorage.getItem("ezproduct_keywords");
        const savedImageUrl = localStorage.getItem("ezproduct_imageUrl");
        const savedSizeOptions = localStorage.getItem("ezproduct_sizeOptions");
        const savedBrandName = localStorage.getItem("ezproduct_brandName");
        const savedProductNotes = localStorage.getItem("ezproduct_productNotes");
        if (savedKeywords) setKeywords(savedKeywords);
        if (savedImageUrl) setImageUrl(savedImageUrl);
        if (savedSizeOptions) setSizeOptions(savedSizeOptions);
        if (savedBrandName) setBrandName(savedBrandName);
        if (savedProductNotes) setProductNotes(savedProductNotes);
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
        localStorage.removeItem("ezproduct_sizeOptions");
        localStorage.removeItem("ezproduct_brandName");
        localStorage.removeItem("ezproduct_productNotes");
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
      title={t('pageTitle', lang)}
      subtitle={t('pageSubtitle', lang)}
      secondaryActions={[
        {
          content: lang === 'en' ? '🌐 中文' : '🌐 English',
          onAction: () => toggleLanguage(lang === 'en' ? 'zh' : 'en'),
        },
      ]}
    >
      <BlockStack gap="500">
        {sessionRefreshed && !result && (
          <Banner tone="warning" title={t('sessionRefreshedTitle', lang)}>
            <p>{t('sessionRefreshedMessage', lang)}</p>
          </Banner>
        )}

        {result === "error" && message && (
          <Banner tone="critical" title={t('errorTitle', lang)}>
            <p>{message}</p>
          </Banner>
        )}

        {result === "success" && (
          <Banner
            tone="success"
            title={t('successTitle', lang)}
            action={
              productId
                ? {
                    content: t('viewProduct', lang),
                    url: `https://${shop}/admin/products/${productId.replace("gid://shopify/Product/", "")}`,
                    external: true,
                  }
                : undefined
            }
          >
            <p>{message || t('successMessage', lang)}</p>
          </Banner>
        )}

        <LegacyCard sectioned title={t('formTitle', lang)}>
          {/* Force a document POST so Shopify's exit-iframe HTML/redirect can execute properly.
              Remix fetch-navigation can treat that HTML as data and show a blank "200" view. */}
          <Form
            method="post"
            reloadDocument
            onSubmit={(e) => {
              setDocumentSubmitting(true);
              console.log("[App UI] Form onSubmit triggered! (v5.0)");
              
              // Save form data to localStorage in case session needs refresh
              try {
                localStorage.setItem("ezproduct_keywords", keywords);
                localStorage.setItem("ezproduct_imageUrl", imageUrl);
                localStorage.setItem("ezproduct_sizeOptions", sizeOptions);
                localStorage.setItem("ezproduct_brandName", brandName);
                localStorage.setItem("ezproduct_productNotes", productNotes);
              } catch (err) {
                console.error("[App UI] Failed to save to localStorage:", err);
              }
              // Don't prevent default - let browser submit
            }}
          >
            {/* Hidden inputs to ensure values are submitted with reloadDocument.
                Polaris TextField doesn't always sync to native form fields. */}
            <input type="hidden" name="keywords" value={keywords} />
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <input type="hidden" name="sizeOptions" value={sizeOptions} />
            <input type="hidden" name="brandName" value={brandName} />
            <input type="hidden" name="productNotes" value={productNotes} />

            <BlockStack gap="400">
              <TextField
                label={t('keywordsLabel', lang)}
                type="text"
                value={keywords}
                onChange={(value) => setKeywords(value)}
                placeholder={t('keywordsPlaceholder', lang)}
                helpText={t('keywordsHelp', lang)}
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <TextField
                label={t('imageUrlLabel', lang)}
                type="url"
                value={imageUrl}
                onChange={(value) => setImageUrl(value)}
                placeholder={t('imageUrlPlaceholder', lang)}
                helpText={t('imageUrlHelp', lang)}
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <TextField
                label={t('sizeOptionsLabel', lang)}
                type="text"
                value={sizeOptions}
                onChange={(value) => setSizeOptions(value)}
                placeholder={t('sizeOptionsPlaceholder', lang)}
                helpText={t('sizeOptionsHelp', lang)}
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <TextField
                label={t('brandNameLabel', lang)}
                type="text"
                value={brandName}
                onChange={(value) => setBrandName(value)}
                placeholder={t('brandNamePlaceholder', lang)}
                helpText={t('brandNameHelp', lang)}
                autoComplete="off"
                disabled={isSubmitting || documentSubmitting}
              />

              <TextField
                label={t('productNotesLabel', lang)}
                type="text"
                value={productNotes}
                onChange={(value) => setProductNotes(value)}
                placeholder={t('productNotesPlaceholder', lang)}
                helpText={t('productNotesHelp', lang)}
                autoComplete="off"
                multiline={3}
                disabled={isSubmitting || documentSubmitting}
              />

              <Button
                submit
                variant="primary"
                loading={isSubmitting || documentSubmitting}
                disabled={isSubmitting || documentSubmitting}
              >
                {isSubmitting || documentSubmitting ? t('submittingButton', lang) : t('submitButton', lang)}
              </Button>
            </BlockStack>
          </Form>
        </LegacyCard>

        <LegacyCard sectioned title={t('batchTitle', lang)}>
          <BlockStack gap="400">
            <Text as="p">{t('batchDescription', lang)}</Text>
            <Text as="p" tone="subdued">{t('csvInstructions', lang)}</Text>
            <Text as="p" tone="subdued">{t('maxBatchSize', lang)}</Text>
            
            <InlineStack gap="300">
              <Button onClick={handleDownloadTemplate}>
                {t('downloadTemplate', lang)}
              </Button>
              
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                  }}
                  disabled={batchProcessing}
                />
                <Button disabled={batchProcessing}>
                  {t('selectFile', lang)}
                </Button>
              </div>
            </InlineStack>
            
            {selectedFileName && (
              <Text as="p">📄 {selectedFileName}</Text>
            )}
            
            {batchProcessing && (
              <Banner tone="info">
                <p>{t('batchProgress', lang).replace('{current}', String(batchProgress.current)).replace('{total}', String(batchProgress.total))}</p>
              </Banner>
            )}
            
            {batchResult && (
              <Banner tone={batchResult.failed > 0 ? "warning" : "success"}>
                <p>{t('batchComplete', lang).replace('{success}', String(batchResult.success)).replace('{failed}', String(batchResult.failed))}</p>
                {batchResult.errors.length > 0 && (
                  <>
                    <p><strong>{t('batchErrors', lang)}</strong></p>
                    <ul>
                      {batchResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Banner>
            )}
          </BlockStack>
        </LegacyCard>
        
        <LegacyCard sectioned title={t('howItWorksTitle', lang)}>
          <BlockStack gap="300">
            <Text as="p">
              <strong>{t('step1Title', lang)}</strong> {t('step1Desc', lang)}
            </Text>
            <Text as="p">
              <strong>{t('step2Title', lang)}</strong>
            </Text>
            <ul>
              <li><strong>•</strong> {t('step2Image', lang)}</li>
              <li><strong>•</strong> {t('step2Size', lang)}</li>
              <li><strong>•</strong> {t('step2Brand', lang)}</li>
              <li><strong>•</strong> {t('step2Notes', lang)}</li>
            </ul>
            <Text as="p">
              <strong>{t('step3Title', lang)}</strong> {t('step3Desc', lang)}
            </Text>
            <ul>
              <li>• {t('step3Item1', lang)}</li>
              <li>• {t('step3Item2', lang)}</li>
              <li>• {t('step3Item3', lang)}</li>
              <li>• {t('step3Item4', lang)}</li>
            </ul>
            <Text as="p">
              <strong>{t('step4Title', lang)}</strong> {t('step4Desc', lang)}
            </Text>
          </BlockStack>
        </LegacyCard>
      </BlockStack>
    </Page>
  );
}


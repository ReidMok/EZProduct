/**
 * Root Component - App Shell
 */

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json, type LinksFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { AppProvider as ShopifyAppProvider, useNonce } from "@shopify/shopify-app-remix/react";
// IMPORTANT:
// Avoid importing JSON directly in SSR builds (can trigger JSON module assertion issues on Vercel).
// Use Vite `?raw` and JSON.parse so it is bundled as plain JS.
import enTranslationsRaw from "@shopify/polaris/locales/en.json?raw";

// IMPORTANT: Load Polaris CSS via Remix `links()` so it doesn't break server builds on Vercel.
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async (_args: LoaderFunctionArgs) => {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY!,
  });
};

export default function App() {
  const enTranslations = JSON.parse(enTranslationsRaw) as Record<string, any>;
  const { apiKey } = useLoaderData<typeof loader>();
  const nonce = useNonce();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Shopify embedded apps require App Bridge provider to supply session tokens for fetch/navigation. */}
        <ShopifyAppProvider isEmbeddedApp apiKey={apiKey}>
          {/* Polaris requires its own AppProvider with i18n; otherwise SSR will throw MissingAppProviderError */}
          <PolarisAppProvider i18n={enTranslations}>
            <Outlet />
          </PolarisAppProvider>
        </ShopifyAppProvider>
        <ScrollRestoration />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}


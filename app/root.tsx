/**
 * Root Component - App Shell
 */

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { type LinksFunction } from "@remix-run/node";
import { AppProvider } from "@shopify/polaris";
// IMPORTANT:
// Avoid importing JSON directly in SSR builds (can trigger JSON module assertion issues on Vercel).
// Use Vite `?raw` and JSON.parse so it is bundled as plain JS.
import enTranslationsRaw from "@shopify/polaris/locales/en.json?raw";

// IMPORTANT: Load Polaris CSS via Remix `links()` so it doesn't break server builds on Vercel.
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: polarisStyles }];

export default function App() {
  const enTranslations = JSON.parse(enTranslationsRaw) as Record<string, any>;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Polaris requires its own AppProvider with i18n; otherwise SSR will throw MissingAppProviderError */}
        <AppProvider i18n={enTranslations}>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}


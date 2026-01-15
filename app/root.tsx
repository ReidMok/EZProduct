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
import { AppProvider, useNonce } from "@shopify/shopify-app-remix/react";

// IMPORTANT: Load Polaris CSS via Remix `links()` so it doesn't break server builds on Vercel.
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Expose only non-secret env vars to the client
  return json({
    apiKey: process.env.SHOPIFY_API_KEY!,
  });
};

export default function App() {
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
        {/* Keep i18n minimal to avoid JSON import issues in some build targets */}
        <AppProvider isEmbeddedApp apiKey={apiKey} i18n={{}}>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        {/* IMPORTANT: Shopify embedded apps require nonce on scripts to satisfy CSP */}
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}


/**
 * Root Route - Handles the root path "/"
 * For Shopify embedded apps, redirect to app route
 */

import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // IMPORTANT:
  // When Shopify loads an embedded app, it includes query params like `shop`, `host`, `embedded`.
  // We must preserve them when redirecting to /app, otherwise OAuth cannot start correctly.
  const url = new URL(request.url);
  const search = url.search || "";
  return redirect(`/app${search}`);
};


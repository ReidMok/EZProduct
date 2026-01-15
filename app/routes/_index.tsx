/**
 * Root Route - Handles the root path "/"
 * For Shopify embedded apps, redirect to app route
 */

import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Simply redirect to app route
  // The app route will handle authentication
  return redirect("/app");
};


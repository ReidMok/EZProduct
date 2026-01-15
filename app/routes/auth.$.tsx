/**
 * Authentication Routes - Catch-all for /auth/* paths
 * 
 * IMPORTANT: This route should NOT handle /auth/callback
 * The specific route auth.callback.tsx takes priority in Remix routing
 * 
 * For embedded Shopify apps, shopify.authenticate.admin() automatically handles
 * the OAuth flow. This route only handles paths that don't have specific routes.
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { pathname, searchParams } = new URL(request.url);
  
  // Log all auth requests for debugging
  console.log(`[Auth $] ${request.method} ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  console.log(`[Auth $] Full URL: ${request.url}`);

  // Skip callback routes - they're handled by auth.callback.tsx
  // In Remix, specific routes (auth.callback.tsx) take priority over catch-all (auth.$.tsx)
  if (pathname === "/auth/callback" || 
      pathname === "/auth/shopify/callback" || 
      pathname === "/api/auth/callback") {
    console.log(`[Auth $] Callback route detected - should be handled by auth.callback.tsx`);
    // Return 404 to let Remix try the specific route
    // If specific route doesn't exist, this will handle it (but it should exist)
    return new Response("Not Found", { status: 404 });
  }

  // For other auth routes, let shopify.authenticate.admin() handle them
  // This includes /auth/login, /auth, etc.
  try {
    console.log(`[Auth $] Calling shopify.authenticate.admin for ${pathname}`);
    const result = await shopify.authenticate.admin(request);
    console.log(`[Auth $] Successfully authenticated for ${pathname}`);
    return result;
  } catch (error) {
    // If it's a Response (redirect), let it through - this is the OAuth flow
    if (error instanceof Response) {
      const location = error.headers.get('Location') || 'unknown';
      console.log(`[Auth $] Redirecting from ${pathname} to ${location}`);
      console.log(`[Auth $] Redirect status: ${error.status} ${error.statusText}`);
      throw error;
    }
    // Log other errors
    console.error(`[Auth $] Error in ${pathname}:`, error);
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle POST requests for auth routes
  return shopify.authenticate.admin(request);
};


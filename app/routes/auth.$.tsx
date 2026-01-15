/**
 * Authentication Routes
 * Handles all authentication-related routes (OAuth callbacks, login, etc.)
 * This catch-all route handles /auth/* paths
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { pathname, searchParams } = new URL(request.url);
  
  // Log all auth requests for debugging
  console.log(`[Auth $] ${request.method} ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  console.log(`[Auth $] Full URL: ${request.url}`);

  // IMPORTANT: Skip callback route - it's handled by auth.callback.tsx
  // In Remix, specific routes (auth.callback.tsx) take priority over catch-all (auth.$.tsx)
  // But we should still avoid handling it here to prevent conflicts
  if (pathname === "/auth/callback" || pathname === "/auth/shopify/callback" || pathname === "/api/auth/callback") {
    console.log(`[Auth $] Callback route detected - should be handled by dedicated callback route`);
    // Return 404 to let Remix try the specific route first
    // If the specific route doesn't exist, this will handle it
    // But since we have auth.callback.tsx, it should be handled there
  }

  // Handle login route
  if (pathname === "/auth/login" || pathname === "/auth") {
    if (shopify.login) {
      console.log(`[Auth $] Calling shopify.login for ${pathname}`);
      try {
        const result = await shopify.login(request);
        console.log(`[Auth $] shopify.login result:`, result);
        if (result && typeof result === 'object' && Object.keys(result).length === 0) {
          return json({});
        }
        return result;
      } catch (error) {
        if (error instanceof Response) {
          console.log(`[Auth $] Redirecting from ${pathname} to ${error.headers.get('Location') || 'unknown'}`);
          throw error;
        }
        throw error;
      }
    }
  }

  // Handle all other auth routes
  // shopify.authenticate.admin will handle the OAuth flow
  try {
    console.log(`[Auth $] Calling shopify.authenticate.admin for ${pathname}`);
    const result = await shopify.authenticate.admin(request);
    console.log(`[Auth $] Successfully authenticated for ${pathname}`);
    return result;
  } catch (error) {
    console.error(`[Auth $] Error in ${pathname}:`, error);
    if (error instanceof Response) {
      console.log(`[Auth $] Redirecting from ${pathname} to ${error.headers.get('Location') || 'unknown'}`);
      console.log(`[Auth $] Redirect status: ${error.status} ${error.statusText}`);
      throw error;
    }
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle POST requests for auth routes
  return shopify.authenticate.admin(request);
};


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
  console.log(`[Auth] ${request.method} ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  console.log(`[Auth] Full URL: ${request.url}`);
  console.log(`[Auth] Headers:`, Object.fromEntries(request.headers.entries()));

  // Handle login route
  if (pathname === "/auth/login" || pathname === "/auth") {
    if (shopify.login) {
      console.log(`[Auth] Calling shopify.login for ${pathname}`);
      try {
        // shopify.login may return a Promise or throw a redirect
        const result = await shopify.login(request);
        console.log(`[Auth] shopify.login result:`, result);
        // If result is an empty object, return it as JSON (Shopify will handle it)
        // Don't redirect to /app as it will cause a redirect loop
        if (result && typeof result === 'object' && Object.keys(result).length === 0) {
          return json({});
        }
        return result;
      } catch (error) {
        // If it's a Response (redirect), let it through
        if (error instanceof Response) {
          console.log(`[Auth] Redirecting from ${pathname} to ${error.headers.get('Location') || 'unknown'}`);
          throw error;
        }
        throw error;
      }
    }
  }

  // Handle all other auth routes (callback, etc.)
  // shopify.authenticate.admin will handle the OAuth flow
  // It may throw redirect (Response) or return a context object
  try {
    console.log(`[Auth] Calling shopify.authenticate.admin for ${pathname}`);
    const result = await shopify.authenticate.admin(request);
    console.log(`[Auth] Successfully authenticated for ${pathname}`);
    return result;
  } catch (error) {
    // Log errors for debugging
    console.error(`[Auth] Error in ${pathname}:`, error);
    // If it's a Response (redirect), let it through
    if (error instanceof Response) {
      console.log(`[Auth] Redirecting from ${pathname} to ${error.headers.get('Location') || 'unknown'}`);
      console.log(`[Auth] Redirect status: ${error.status} ${error.statusText}`);
      throw error;
    }
    throw error;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle POST requests for auth routes
  return shopify.authenticate.admin(request);
};


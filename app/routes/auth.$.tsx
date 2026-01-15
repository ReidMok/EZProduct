/**
 * Authentication Routes
 * Handles all authentication-related routes (OAuth callbacks, login, etc.)
 * This catch-all route handles /auth/* paths
 * 
 * For embedded Shopify apps, shopify.authenticate.admin() automatically handles
 * the OAuth flow, including redirecting to Shopify OAuth page when needed.
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { pathname, searchParams } = new URL(request.url);
  
  // Log all auth requests for debugging
  console.log(`[Auth $] ${request.method} ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  console.log(`[Auth $] Full URL: ${request.url}`);

  // For embedded apps, shopify.authenticate.admin() handles everything:
  // - If no session exists, it redirects to Shopify OAuth
  // - If session exists, it returns the authenticated context
  // - It handles OAuth callbacks automatically
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


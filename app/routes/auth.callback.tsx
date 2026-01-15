/**
 * OAuth Callback Route - Handles /auth/callback
 * This is the route Shopify redirects to after OAuth authorization
 */

import { type LoaderFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log(`[Auth Callback] GET ${request.url}`);
  console.log(`[Auth Callback] Full URL: ${request.url}`);
  console.log(`[Auth Callback] Headers:`, Object.fromEntries(request.headers.entries()));
  
  try {
    // shopify.authenticate.admin will handle the OAuth callback
    // It will create the session and redirect to /app
    const result = await shopify.authenticate.admin(request);
    console.log(`[Auth Callback] Successfully authenticated`);
    return result;
  } catch (error) {
    console.error(`[Auth Callback] Error:`, error);
    // If it's a Response (redirect), let it through
    if (error instanceof Response) {
      console.log(`[Auth Callback] Redirecting to ${error.headers.get('Location') || 'unknown'}`);
      throw error;
    }
    throw error;
  }
};


/**
 * Authentication Routes - Catch-all for /auth/* paths
 * 
 * This route is REQUIRED by Shopify App Remix to handle OAuth flow.
 * 
 * shopify.authenticate.admin() automatically handles:
 * - OAuth login initiation (redirects to Shopify OAuth page)
 * - OAuth callback processing (creates session and redirects to /app)
 * 
 * DO NOT add manual redirect logic - let Shopify handle it automatically.
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Simply call shopify.authenticate.admin() and let it handle everything
  // It will automatically:
  // 1. Redirect to Shopify OAuth if no session exists
  // 2. Process OAuth callback if callback parameters are present
  // 3. Return authenticated context if session exists
  return shopify.authenticate.admin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return shopify.authenticate.admin(request);
};


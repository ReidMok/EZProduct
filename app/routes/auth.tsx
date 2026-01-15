/**
 * Auth entry route - /auth
 *
 * Shopify often redirects to `/auth?shop=...&host=...` (without `/login`).
 * If we don't have an explicit /auth route, Remix will 404.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return shopify.authenticate.admin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return shopify.authenticate.admin(request);
};



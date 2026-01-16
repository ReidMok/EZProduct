/**
 * Explicit exit-iframe route - /auth/exit-iframe
 * Shopify embedded auth can redirect here to break out of iframe.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return shopify.authenticate.admin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return shopify.authenticate.admin(request);
};





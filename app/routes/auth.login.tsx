/**
 * Explicit OAuth login route - /auth/login
 * Some embedded auth strategies hit this path directly.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return shopify.authenticate.admin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return shopify.authenticate.admin(request);
};



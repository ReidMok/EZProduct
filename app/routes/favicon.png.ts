/**
 * Handle /favicon.png requests to avoid noisy 404 logs on Vercel.
 * We return 204 No Content since we don't ship a favicon.png.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response(null, { status: 204 });
};





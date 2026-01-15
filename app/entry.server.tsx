/**
 * Server Entry Point
 */

import "@shopify/shopify-api/adapters/node";
import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import shopify from "./shopify.server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  // Log request for debugging
  console.log(`[Remix] ${request.method} ${request.url}`);
  
  // Add Shopify document response headers for embedded app
  // This must be called BEFORE rendering to ensure headers are set correctly
  shopify.addDocumentResponseHeaders(request, responseHeaders);

  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}


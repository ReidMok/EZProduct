/**
 * Webhook handler for Shopify compliance webhooks
 * This route handles all webhook events from Shopify
 * 
 * Required compliance webhooks:
 * - app/uninstalled: When app is uninstalled
 * - customers/data_request: GDPR data request
 * - customers/redact: GDPR customer data deletion
 * - shop/redact: GDPR shop data deletion
 */

import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import shopify from "../shopify.server";
import { prisma } from "../db.server";

// Handle GET requests (Shopify may send GET to verify webhook endpoint)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Return 200 OK to acknowledge the endpoint exists
  // Shopify may send GET requests to verify the webhook endpoint
  return json({ status: "ok" }, { status: 200 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // shopify.authenticate.webhook automatically verifies HMAC signature
  const { topic, shop, payload } = await shopify.authenticate.webhook(request);

  console.log(`[Webhook] Received webhook: ${topic} for shop: ${shop}`);

  // Handle different webhook topics
  switch (topic) {
    case "APP_UNINSTALLED":
      // When app is uninstalled, delete all sessions and shop data
      console.log(`[Webhook] App uninstalled for shop: ${shop}`);
      
      try {
        // Delete all sessions for this shop
        await prisma.session.deleteMany({
          where: { shop },
        });
        
        // Delete shop record
        await prisma.shop.deleteMany({
          where: { shop },
        });
        
        // Optionally delete product generation history
        // await prisma.productGeneration.deleteMany({
        //   where: { shop },
        // });
        
        console.log(`[Webhook] Successfully cleaned up data for shop: ${shop}`);
      } catch (error) {
        console.error(`[Webhook] Error cleaning up data for shop ${shop}:`, error);
        // Still return 200 to acknowledge receipt
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
      // GDPR: Customer requests their data
      console.log(`[Webhook] Customer data request for shop: ${shop}`, payload);
      // According to GDPR, we should provide customer data
      // Since we don't store customer data, we just acknowledge
      break;

    case "CUSTOMERS_REDACT":
      // GDPR: Customer requests data deletion
      console.log(`[Webhook] Customer redact request for shop: ${shop}`, payload);
      // According to GDPR, we should delete customer data
      // Since we don't store customer data, we just acknowledge
      break;

    case "SHOP_REDACT":
      // GDPR: Shop requests data deletion
      console.log(`[Webhook] Shop redact request for shop: ${shop}`, payload);
      // According to GDPR, we should delete shop data
      // This is similar to APP_UNINSTALLED, but triggered by GDPR request
      try {
        await prisma.session.deleteMany({
          where: { shop },
        });
        
        await prisma.shop.deleteMany({
          where: { shop },
        });
        
        console.log(`[Webhook] Successfully redacted data for shop: ${shop}`);
      } catch (error) {
        console.error(`[Webhook] Error redacting data for shop ${shop}:`, error);
      }
      break;

    case "SHOP_UPDATE":
      // Handle shop update events if needed
      console.log(`[Webhook] Shop updated: ${shop}`);
      break;

    default:
      console.log(`[Webhook] Unhandled webhook topic: ${topic}`);
  }

  // Always return 200 to acknowledge receipt
  // This is required by Shopify - webhook must return 200 OK
  return json({ received: true }, { status: 200 });
};

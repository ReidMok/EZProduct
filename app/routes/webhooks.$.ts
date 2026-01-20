/**
 * Webhook handler for Shopify compliance webhooks
 * This route handles all webhook events from Shopify
 */

import { ActionFunctionArgs, json } from "@remix-run/node";
import shopify from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
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

    case "SHOP_UPDATE":
      // Handle shop update events if needed
      console.log(`[Webhook] Shop updated: ${shop}`);
      break;

    default:
      console.log(`[Webhook] Unhandled webhook topic: ${topic}`);
  }

  // Always return 200 to acknowledge receipt
  return json({ received: true }, { status: 200 });
};

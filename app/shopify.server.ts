/**
 * Shopify Authentication and API Setup
 */

import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { prisma } from "./db.server";

class ShopifyPrismaSessionStorage {
  constructor(private prisma: any) {}

  async storeSession(session: any) {
    console.log(`[SessionStorage] Storing session for shop: ${session.shop}`);
    await this.prisma.shop.upsert({
      where: { shop: session.shop },
      update: {
        accessToken: session.accessToken,
        scope: session.scope,
      },
      create: {
        shop: session.shop,
        accessToken: session.accessToken,
        scope: session.scope,
      },
    });
    console.log(`[SessionStorage] Session stored successfully for shop: ${session.shop}`);
  }

  async loadSession(id: string) {
    console.log(`[SessionStorage] Loading session for shop: ${id}`);
    const shop = await this.prisma.shop.findUnique({
      where: { shop: id },
    });
    if (!shop) {
      console.log(`[SessionStorage] No session found for shop: ${id}`);
      return undefined;
    }

    console.log(`[SessionStorage] Session loaded successfully for shop: ${id}`);
    return {
      id: shop.shop,
      shop: shop.shop,
      state: "",
      isOnline: false,
      accessToken: shop.accessToken,
      scope: shop.scope,
    };
  }

  async deleteSession(id: string) {
    await this.prisma.shop.delete({
      where: { shop: id },
    });
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES?.split(",") || ["write_products", "read_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "https://localhost:3000",
  sessionStorage: new ShopifyPrismaSessionStorage(prisma),
});

export default shopify;


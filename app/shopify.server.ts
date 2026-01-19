/**
 * Shopify Authentication and API Setup
 */

import "@shopify/shopify-api/adapters/node";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { Session } from "@shopify/shopify-api";
import { prisma } from "./db.server";

class ShopifyPrismaSessionStorage {
  constructor(private prismaClient: typeof prisma) {}

  /**
   * Shopify App Remix expects these methods to match its SessionStorage contract.
   * Critical points:
   * - Use session.id as the primary key (NOT shop domain)
   * - Methods should return boolean where expected
   */

  async storeSession(session: any): Promise<boolean> {
    console.log(`[SessionStorage] storeSession id=${session.id} shop=${session.shop}`);

    const expires =
      session.expires instanceof Date
        ? session.expires
        : typeof session.expires === "string" || typeof session.expires === "number"
          ? new Date(session.expires)
          : null;

    await this.prismaClient.session.upsert({
      where: { id: session.id },
      update: {
        shop: session.shop,
        state: session.state ?? null,
        isOnline: Boolean(session.isOnline),
        scope: session.scope ?? null,
        accessToken: session.accessToken,
        expires,
        onlineAccessInfo: session.onlineAccessInfo ?? null,
      },
      create: {
        id: session.id,
        shop: session.shop,
        state: session.state ?? null,
        isOnline: Boolean(session.isOnline),
        scope: session.scope ?? null,
        accessToken: session.accessToken,
        expires,
        onlineAccessInfo: session.onlineAccessInfo ?? null,
      },
    });

    // Optional: keep a Shop record for your app’s own data/history linkage
    // This is NOT the session storage; it’s just convenient for ProductGeneration relations.
    try {
      await this.prismaClient.shop.upsert({
        where: { shop: session.shop },
        update: {
          accessToken: session.accessToken,
          scope: session.scope ?? "",
        },
        create: {
          shop: session.shop,
          accessToken: session.accessToken,
          scope: session.scope ?? "",
        },
      });
    } catch (e) {
      console.error(`[SessionStorage] Failed to upsert Shop record for ${session.shop}:`, e);
    }

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    console.log(`[SessionStorage] loadSession id=${id}`);
    const s = await this.prismaClient.session.findUnique({ where: { id } });
    if (!s) return undefined;

    // IMPORTANT: Shopify App Remix expects a Session instance that has methods like `isActive()`.
    return new Session({
      id: s.id,
      shop: s.shop,
      state: s.state ?? "",
      isOnline: s.isOnline,
      scope: s.scope ?? undefined,
      accessToken: s.accessToken,
      expires: s.expires ?? undefined,
      onlineAccessInfo: (s.onlineAccessInfo as any) ?? undefined,
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    console.log(`[SessionStorage] deleteSession id=${id}`);
    await this.prismaClient.session.deleteMany({ where: { id } });
    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const sessions = await this.prismaClient.session.findMany({ where: { shop } });
    return sessions.map(
      (s) =>
        new Session({
          id: s.id,
          shop: s.shop,
          state: s.state ?? "",
          isOnline: s.isOnline,
          scope: s.scope ?? undefined,
          accessToken: s.accessToken,
          expires: s.expires ?? undefined,
          onlineAccessInfo: (s.onlineAccessInfo as any) ?? undefined,
        })
    );
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES?.split(",") || ["write_products", "read_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "https://localhost:3000",
  sessionStorage: new ShopifyPrismaSessionStorage(prisma),
  // Enable Token Exchange for embedded apps - this automatically refreshes session tokens
  // instead of requiring manual redirects, solving the "session token expired" loop
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  // For embedded apps, we need to specify the auth path prefix
  authPathPrefix: "/auth",
});

export default shopify;


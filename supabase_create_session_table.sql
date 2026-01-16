-- Create Session table for Shopify App Remix session storage
-- Run this in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "state" TEXT,
  "isOnline" BOOLEAN NOT NULL DEFAULT FALSE,
  "scope" TEXT,
  "accessToken" TEXT NOT NULL,
  "expires" TIMESTAMP(3),
  "onlineAccessInfo" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "Session"("shop");




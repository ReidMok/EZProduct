-- 创建 Shop 表
CREATE TABLE IF NOT EXISTS "Shop" (
  "id" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Shop_shop_key" ON "Shop"("shop");
CREATE INDEX IF NOT EXISTS "Shop_shop_idx" ON "Shop"("shop");

-- 创建 ProductGeneration 表
CREATE TABLE IF NOT EXISTS "ProductGeneration" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "keywords" TEXT NOT NULL,
  "imageUrl" TEXT,
  "title" TEXT NOT NULL,
  "descriptionHtml" TEXT NOT NULL,
  "tags" TEXT NOT NULL,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "variantsJson" TEXT NOT NULL,
  "shopifyProductId" TEXT,
  "shopifyProductHandle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductGeneration_shopId_idx" ON "ProductGeneration"("shopId");
CREATE INDEX IF NOT EXISTS "ProductGeneration_status_idx" ON "ProductGeneration"("status");
CREATE INDEX IF NOT EXISTS "ProductGeneration_createdAt_idx" ON "ProductGeneration"("createdAt");

-- 添加外键约束
ALTER TABLE "ProductGeneration" 
  DROP CONSTRAINT IF EXISTS "ProductGeneration_shopId_fkey";

ALTER TABLE "ProductGeneration" 
  ADD CONSTRAINT "ProductGeneration_shopId_fkey" 
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;


# 📋 完整创建表的 SQL

## ⚠️ 重要

从截图看，你的 SQL 只包含了 `Shop` 表，**缺少 `ProductGeneration` 表**。

## ✅ 完整的 SQL（复制全部）

在 Supabase SQL Editor 中，**删除旧查询，粘贴以下完整 SQL**：

```sql
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
```

## 🚀 执行步骤

1. **在 Supabase SQL Editor 中**
   - 删除当前的 SQL（只包含 Shop 表的部分）
   - 粘贴上面的完整 SQL

2. **点击 "Run" 或按 `Ctrl/Cmd + Enter`**

3. **验证表已创建**
   - 应该看到 "Success" 消息
   - 在 Table Editor 中应该能看到两个表：
     - `Shop`
     - `ProductGeneration`

## ✅ 完成后的验证

1. **在 Table Editor 中**
   - 应该能看到 `Shop` 和 `ProductGeneration` 两个表
   - 两个表都应该是空的（这是正常的，数据会在 OAuth 完成后写入）

2. **然后重新安装应用**
   - 在 Shopify 后台卸载并重新安装应用
   - 完成 OAuth 授权后，`Shop` 表中应该有数据

---

先运行完整的 SQL，然后告诉我结果！





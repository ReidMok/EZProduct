# 创建 .env 文件 - 立即执行

## 🎯 当前问题

错误显示：`Environment variable not found: DATABASE_URL`

这是因为还没有创建 `.env` 文件。现在需要执行第四步。

## ✅ 第四步：创建 .env 文件

### 方法1：使用命令创建（推荐）

在终端中执行：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 创建.env文件
cat > .env << 'EOF'
# Shopify App Configuration
SHOPIFY_API_KEY=你的Shopify_API_Key
SHOPIFY_API_SECRET=你的Shopify_API_Secret
SCOPES=write_products,read_products,write_product_listings,read_product_listings
SHOPIFY_APP_URL=https://localhost:3000

# Database
DATABASE_URL="file:./dev.db"

# AI API Configuration
GEMINI_API_KEY=你的Gemini_API_Key

# App Environment
NODE_ENV=development
EOF
```

### 方法2：手动创建

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
touch .env
open -e .env
```

然后复制粘贴以下内容：

```env
# Shopify App Configuration
SHOPIFY_API_KEY=你的Shopify_API_Key
SHOPIFY_API_SECRET=你的Shopify_API_Secret
SCOPES=write_products,read_products,write_product_listings,read_product_listings
SHOPIFY_APP_URL=https://localhost:3000

# Database
DATABASE_URL="file:./dev.db"

# AI API Configuration
GEMINI_API_KEY=你的Gemini_API_Key

# App Environment
NODE_ENV=development
```

## ⚠️ 重要：先填入 DATABASE_URL

**为了能立即执行 `npm run db:migrate`，至少要先填入 DATABASE_URL：**

编辑 `.env` 文件，确保这一行存在：

```env
DATABASE_URL="file:./dev.db"
```

其他API密钥可以稍后填入。

## 🔄 执行顺序

1. **先创建 .env 文件**（第四步）
2. **至少填入 DATABASE_URL**
3. **然后重新执行第三步**：`npm run db:migrate`
4. **最后填入其他API密钥**

## ✅ 验证

创建后验证：

```bash
# 检查文件是否存在
ls -la .env

# 检查DATABASE_URL是否设置
grep DATABASE_URL .env
```

如果看到 `DATABASE_URL="file:./dev.db"`，说明配置正确！

## 🎯 快速执行（最小配置）

如果只想先让数据库迁移成功，可以只创建最小配置：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 创建最小配置的.env文件
echo 'DATABASE_URL="file:./dev.db"' > .env

# 验证
cat .env

# 然后重新执行迁移
npm run db:migrate
```

其他API密钥可以稍后再添加。





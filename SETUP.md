# EZProduct - 完整设置指南

## 第一步：项目初始化

### 1. 安装依赖

```bash
cd ezproduct
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# Shopify App 配置
SHOPIFY_API_KEY=你的Shopify_API_Key
SHOPIFY_API_SECRET=你的Shopify_API_Secret
SCOPES=write_products,read_products,write_product_listings,read_product_listings
SHOPIFY_APP_URL=https://你的应用域名.com

# 数据库配置
DATABASE_URL="file:./dev.db"  # 开发环境使用SQLite

# AI API配置
GEMINI_API_KEY=你的Gemini_API_Key

# 图片托管（可选）
CLOUDINARY_CLOUD_NAME=你的Cloudinary_Cloud_Name
CLOUDINARY_API_KEY=你的Cloudinary_API_Key
CLOUDINARY_API_SECRET=你的Cloudinary_API_Secret
```

### 3. 获取API密钥

#### Google Gemini API Key
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的API密钥
3. 复制到 `.env` 文件的 `GEMINI_API_KEY`

#### Shopify API凭证
1. 登录 [Shopify Partner Dashboard](https://partners.shopify.com/)
2. 创建新应用或选择现有应用
3. 在"API credentials"中获取：
   - API Key → `SHOPIFY_API_KEY`
   - API Secret → `SHOPIFY_API_SECRET`
4. 在 `shopify.app.toml` 中更新 `client_id`

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# （可选）打开Prisma Studio查看数据库
npm run db:studio
```

## 第二步：配置Shopify App

### 1. 更新 shopify.app.toml

编辑 `shopify.app.toml`：

```toml
name = "AI Product Pro"
client_id = "你的Client_ID"  # 从Partner Dashboard获取
application_url = "https://你的应用域名.com"
embedded = true

[access_scopes]
scopes = "write_products,read_products,write_product_listings,read_product_listings"

[auth]
redirect_urls = [
  "https://你的应用域名.com/auth/callback",
  "https://你的应用域名.com/auth/shopify/callback",
  "https://你的应用域名.com/api/auth/callback"
]

[build]
dev_store_url = "你的开发店铺.myshopify.com"
```

### 2. 权限说明

应用需要以下权限：
- `write_products`: 创建和编辑产品
- `read_products`: 读取产品信息
- `write_product_listings`: 创建产品列表
- `read_product_listings`: 读取产品列表

## 第三步：开发环境运行

### 1. 启动开发服务器

```bash
npm run dev
```

Shopify CLI会自动：
- 启动本地开发服务器
- 创建ngrok隧道
- 打开Shopify开发店铺进行安装

### 2. 测试应用

1. 在Shopify开发店铺中安装应用
2. 打开应用界面
3. 输入产品关键词（如："Three Divers Resin Night Light"）
4. 点击"Generate & Sync Product"
5. 检查产品是否成功创建

## 第四步：图片上传配置（可选）

### 方案1：使用Cloudinary（推荐）

1. 注册 [Cloudinary账户](https://cloudinary.com/)
2. 在Dashboard中创建上传预设（Upload Preset）
3. 在 `.env` 中配置Cloudinary凭证
4. 在代码中使用 `uploadToCloudinary()` 函数

### 方案2：使用Shopify Files API（最简单）

直接使用 `uploadToShopify()` 函数，图片会上传到Shopify的CDN。

### 方案3：使用AWS S3

1. 创建S3存储桶
2. 配置IAM权限
3. 在 `.env` 中配置AWS凭证
4. 实现 `uploadToS3()` 函数

## 第五步：生产环境部署

### 1. 数据库迁移到PostgreSQL

```env
# .env (生产环境)
DATABASE_URL="postgresql://user:password@host:5432/database"
```

运行迁移：
```bash
npm run db:migrate
```

### 2. 构建应用

```bash
npm run build
```

### 3. 部署到Shopify

```bash
npm run deploy
```

## 常见问题

### Q: "GEMINI_API_KEY is not set" 错误
A: 确保 `.env` 文件存在且包含 `GEMINI_API_KEY`，然后重启开发服务器。

### Q: Shopify API认证失败
A: 检查：
- `SHOPIFY_API_KEY` 和 `SHOPIFY_API_SECRET` 是否正确
- `shopify.app.toml` 中的 `client_id` 是否匹配
- 重定向URL是否在Shopify Partner Dashboard中配置

### Q: 数据库连接错误
A: 确保：
- `DATABASE_URL` 格式正确
- 已运行 `npm run db:migrate`
- SQLite文件有写入权限

### Q: AI生成的产品格式不正确
A: 检查：
- Gemini API密钥是否有效
- API配额是否用完
- 网络连接是否正常

## 下一步开发建议

1. **添加产品历史查看页面**：显示所有生成的产品
2. **批量生成功能**：一次生成多个产品
3. **产品编辑功能**：在同步前编辑AI生成的内容
4. **图片上传界面**：支持拖拽上传图片
5. **SKU自动递增**：从数据库获取下一个可用SKU编号
6. **错误重试机制**：失败时自动重试
7. **Webhook集成**：监听产品创建事件

## 技术支持

如有问题，请检查：
- 控制台错误日志
- Shopify API响应
- 数据库记录
- AI API响应


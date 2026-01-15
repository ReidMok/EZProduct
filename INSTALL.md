# EZProduct - 安装指南

## 📋 你需要完成的步骤

### 第一步：安装依赖包

在终端中执行：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
npm install
```

如果遇到权限问题，可以尝试：
```bash
sudo npm install
```

或者使用 yarn：
```bash
yarn install
```

### 第二步：配置环境变量

1. **创建 `.env` 文件**：
   ```bash
   cp .env.example .env
   ```

2. **编辑 `.env` 文件**，填入以下信息：

   #### 🔑 必须配置的项：

   **1. Google Gemini API Key**
   - 访问：https://makersuite.google.com/app/apikey
   - 创建新的API密钥
   - 复制到 `.env` 文件：
     ```
     GEMINI_API_KEY=你的Gemini_API_Key
     ```

   **2. Shopify API 凭证**
   - 访问：https://partners.shopify.com/
   - 登录你的Partner账户
   - 创建新应用或选择现有应用
   - 在"API credentials"中获取：
     ```
     SHOPIFY_API_KEY=你的API_Key
     SHOPIFY_API_SECRET=你的API_Secret
     ```

   **3. Shopify App URL**
   - 如果你有域名，使用：`https://你的域名.com`
   - 开发环境可以先使用：`https://localhost:3000`
   - 填入：
     ```
     SHOPIFY_APP_URL=https://你的应用URL
     ```

   **4. 数据库配置**
   - 开发环境使用SQLite（默认）：
     ```
     DATABASE_URL="file:./dev.db"
     ```

   #### 📝 完整 `.env` 示例：

   ```env
   # Shopify App Configuration
   SHOPIFY_API_KEY=abc123def456
   SHOPIFY_API_SECRET=xyz789secret
   SCOPES=write_products,read_products,write_product_listings,read_product_listings
   SHOPIFY_APP_URL=https://your-app-url.com

   # Database
   DATABASE_URL="file:./dev.db"

   # AI API Configuration
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

   # Image Hosting (Optional)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # App Environment
   NODE_ENV=development
   ```

### 第三步：初始化数据库

```bash
# 生成Prisma客户端
npm run db:generate

# 运行数据库迁移（创建数据库表）
npm run db:migrate
```

### 第四步：配置 Shopify App

1. **更新 `shopify.app.toml`**：

   编辑 `shopify.app.toml` 文件，更新以下内容：

   ```toml
   name = "EZProduct"
   client_id = "你的Client_ID"  # 从Shopify Partner Dashboard获取
   application_url = "https://你的应用URL"
   
   [access_scopes]
   scopes = "write_products,read_products,write_product_listings,read_product_listings"
   
   [auth]
   redirect_urls = [
     "https://你的应用URL/auth/callback",
     "https://你的应用URL/auth/shopify/callback",
     "https://你的应用URL/api/auth/callback"
   ]
   
   [build]
   dev_store_url = "你的开发店铺.myshopify.com"
   ```

2. **在Shopify Partner Dashboard中配置**：
   - 登录 https://partners.shopify.com/
   - 进入你的应用
   - 在"App setup"中配置：
     - **App URL**: 你的应用URL
     - **Allowed redirection URL(s)**: 
       - `https://你的应用URL/auth/callback`
       - `https://你的应用URL/auth/shopify/callback`
       - `https://你的应用URL/api/auth/callback`

### 第五步：启动开发服务器

```bash
npm run dev
```

这个命令会：
- 启动本地开发服务器
- 自动创建ngrok隧道（如果需要）
- 打开浏览器让你在Shopify开发店铺中安装应用

### 第六步：测试应用

1. 在Shopify开发店铺中安装应用
2. 打开应用界面
3. 输入产品关键词（例如："Three Divers Resin Night Light"）
4. 点击"Generate & Sync Product"
5. 检查产品是否成功创建在你的Shopify店铺中

## ✅ 检查清单

完成以下所有项后，应用就可以使用了：

- [ ] 已运行 `npm install` 安装依赖
- [ ] 已创建 `.env` 文件并配置所有必需的API密钥
- [ ] 已运行 `npm run db:generate` 生成Prisma客户端
- [ ] 已运行 `npm run db:migrate` 创建数据库表
- [ ] 已更新 `shopify.app.toml` 中的配置
- [ ] 已在Shopify Partner Dashboard中配置应用URL和重定向URL
- [ ] 已成功运行 `npm run dev` 启动开发服务器

## 🆘 常见问题

### Q: npm install 失败怎么办？
A: 尝试：
- 使用 `sudo npm install`（macOS/Linux）
- 或使用 `yarn install`
- 或检查Node.js版本（需要18+）

### Q: 找不到Gemini API Key？
A: 
1. 访问 https://makersuite.google.com/app/apikey
2. 点击"Create API Key"
3. 复制生成的密钥到 `.env` 文件

### Q: Shopify API凭证在哪里？
A:
1. 登录 https://partners.shopify.com/
2. 进入"Apps"
3. 选择你的应用
4. 在"API credentials"部分查看

### Q: 数据库迁移失败？
A: 确保：
- `DATABASE_URL` 格式正确
- 有写入权限
- 已运行 `npm run db:generate`

## 📞 需要帮助？

如果遇到问题，检查：
1. 控制台错误信息
2. `.env` 文件配置是否正确
3. Shopify Partner Dashboard中的配置
4. 网络连接是否正常


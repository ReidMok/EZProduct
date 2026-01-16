# 🚀 Vercel 生产环境配置 - 立即执行

## ✅ 当前状态

- ✅ 代码已成功部署到 Vercel
- ✅ 部署 URL: `https://shopifyezproduct.vercel.app`
- ⚠️ 显示 "410 Gone" 是正常的（Shopify 嵌入式应用不能直接访问）

## 📋 需要完成的 3 个步骤

### 步骤 1：在 Vercel 中配置环境变量

1. **进入 Vercel Dashboard**
   - 打开：https://vercel.com/dashboard
   - 点击你的项目 `shopify_ezproduct`

2. **进入设置**
   - 点击顶部 "Settings" 标签
   - 点击左侧 "Environment Variables"

3. **添加以下环境变量**（点击 "Add New" 逐个添加）：

   ```
   SHOPIFY_API_KEY=你的Shopify_API_Key
   SHOPIFY_API_SECRET=你的Shopify_API_Secret
   SCOPES=write_products,read_products,write_product_listings,read_product_listings
   SHOPIFY_APP_URL=https://shopifyezproduct.vercel.app
   DATABASE_URL=你的PostgreSQL连接字符串（见步骤2）
   GEMINI_API_KEY=你的Gemini_API_Key
   NODE_ENV=production
   ```

   **重要：**
   - 每个变量都要选择 "Production" 环境
   - 添加完所有变量后，点击 "Save"

4. **重新部署**
   - 添加完环境变量后，Vercel 会自动触发重新部署
   - 或手动点击 "Deployments" → 最新部署 → "Redeploy"

---

### 步骤 2：配置生产数据库（Supabase）

#### 选项 A：使用 Supabase（推荐，免费）

1. **注册 Supabase**
   - 访问：https://supabase.com
   - 用 GitHub 账号登录

2. **创建项目**
   - 点击 "New Project"
   - 填写：
     - **Name**: `ezproduct`
     - **Database Password**: 设置强密码（保存好！）
     - **Region**: 选择离你最近的区域
   - 点击 "Create new project"
   - 等待 2-3 分钟

3. **获取连接字符串**
   - 进入项目后，点击左侧 "Settings" → "Database"
   - 找到 "Connection string"
   - 选择 "URI" 标签
   - 复制连接字符串（格式：`postgresql://postgres:[YOUR-PASSWORD]@...`）
   - **重要**：将 `[YOUR-PASSWORD]` 替换为你创建项目时设置的密码

4. **运行数据库迁移**
   - 在本地终端执行：
     ```bash
     cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
     DATABASE_URL="你的Supabase连接字符串" npm run db:migrate
     ```

5. **将 DATABASE_URL 添加到 Vercel**
   - 回到 Vercel Dashboard
   - Settings → Environment Variables
   - 添加 `DATABASE_URL` = 你的 Supabase 连接字符串

#### 选项 B：使用其他 PostgreSQL 服务

如果你有其他 PostgreSQL 数据库，直接使用其连接字符串即可。

---

### 步骤 3：更新 Shopify Partner Dashboard

1. **登录 Shopify Partners**
   - 访问：https://partners.shopify.com/
   - 登录你的账号

2. **进入应用设置**
   - 点击左侧 "应用分发" (App Distribution)
   - 点击你的 `EZProduct` 应用

3. **更新 App URL**
   - 进入 "应用版本" (App Versions)
   - 点击你的应用版本（或创建新版本）
   - 找到 "App URL"
   - 改为：`https://shopifyezproduct.vercel.app`

4. **更新 Redirect URLs**
   - 在同一个页面，找到 "Allowed redirection URL(s)"
   - 添加以下 URL（每行一个）：
     ```
     https://shopifyezproduct.vercel.app/auth/callback
     https://shopifyezproduct.vercel.app/auth/shopify/callback
     https://shopifyezproduct.vercel.app/api/auth/callback
     ```

5. **保存更改**
   - 点击 "Save" 保存所有更改

---

## ✅ 完成后的验证

完成以上 3 个步骤后：

1. **等待 Vercel 重新部署完成**（通常 2-3 分钟）

2. **在 Shopify 中安装应用**
   - 访问你的开发商店：`https://你的商店.myshopify.com/admin`
   - 进入 "应用" (Apps)
   - 点击 "开发应用" (Develop apps)
   - 找到 `EZProduct` 并点击 "安装" (Install)
   - 完成 OAuth 授权流程

3. **测试应用**
   - 安装成功后，应该能看到应用界面
   - 尝试生成一个产品测试功能

---

## 🆘 如果遇到问题

### 问题 1：环境变量未生效
- **解决**：添加环境变量后，必须重新部署
- 在 Vercel Dashboard 点击 "Redeploy"

### 问题 2：数据库连接失败
- **检查**：DATABASE_URL 格式是否正确
- **检查**：Supabase 项目是否已创建完成
- **检查**：密码是否正确替换了 `[YOUR-PASSWORD]`

### 问题 3：Shopify OAuth 失败
- **检查**：Shopify Partner Dashboard 中的 URL 是否与 Vercel URL 完全一致
- **检查**：Redirect URLs 是否已正确添加
- **检查**：SHOPIFY_API_KEY 和 SHOPIFY_API_SECRET 是否正确

---

## 📝 快速检查清单

- [ ] Vercel 环境变量已配置（7 个变量）
- [ ] Supabase 数据库已创建并运行迁移
- [ ] Shopify Partner Dashboard URL 已更新
- [ ] Vercel 重新部署完成
- [ ] 在 Shopify 中成功安装应用

完成这些步骤后，你的应用就可以在生产环境使用了！🎉


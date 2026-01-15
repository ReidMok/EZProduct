# ✅ Vercel 部署清单

## 📋 部署前检查

### ✅ 已完成的准备工作

- [x] Prisma Schema 已更新为 PostgreSQL
- [x] package.json 已配置生产环境脚本
- [x] vercel.json 已配置
- [x] 构建脚本已配置

## 🚀 部署步骤（按顺序执行）

### 步骤1：创建 Supabase 数据库（5分钟）

1. **访问** https://supabase.com/dashboard
2. **创建新项目**
   - 点击 "New Project"
   - 填写项目名称（例如：`ezproduct`）
   - 设置数据库密码（**保存好密码！**）
   - 选择区域（选择离你最近的）
   - 点击 "Create new project"
   - 等待 2-3 分钟创建完成

3. **获取数据库连接字符串**
   - 进入项目后，点击左侧 "Settings"
   - 点击 "Database"
   - 找到 "Connection string" 部分
   - 选择 "URI" 标签
   - 复制连接字符串（格式：`postgresql://postgres:[YOUR-PASSWORD]@...`）
   - **重要**：将 `[YOUR-PASSWORD]` 替换为你创建项目时设置的密码
   - 最终格式应该是：`postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres`

### 步骤2：准备 GitHub 仓库（如果没有）

如果代码还没有在 GitHub：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit - EZProduct Shopify App"

# 在 GitHub 创建新仓库后，添加远程仓库
# git remote add origin https://github.com/你的用户名/ezproduct.git
# git push -u origin main
```

### 步骤3：部署到 Vercel（10分钟）

1. **访问** https://vercel.com
2. **登录**
   - 点击 "Sign Up" 或 "Log In"
   - 推荐使用 GitHub 账号登录（方便后续自动部署）

3. **导入项目**
   - 点击 "Add New" → "Project"
   - 如果代码在 GitHub，选择你的仓库
   - 如果不在 GitHub，先完成步骤2

4. **配置项目**
   - **Framework Preset**: Remix（应该自动检测）
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build && npm run db:generate`（应该自动填充）
   - **Output Directory**: `.vercel`（默认）
   - **Install Command**: `npm install`（默认）

5. **配置环境变量**
   在 "Environment Variables" 部分，点击 "Add" 添加以下变量：

   ```
   # Shopify
   SHOPIFY_API_KEY=你的Shopify_API_Key
   SHOPIFY_API_SECRET=你的Shopify_API_Secret
   SCOPES=write_products,read_products,write_product_listings,read_product_listings
   SHOPIFY_APP_URL=https://你的应用.vercel.app（先填这个，部署后会更新）
   
   # Database (Supabase)
   DATABASE_URL=postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres
   
   # AI
   GEMINI_API_KEY=你的Gemini_API_Key
   
   # Environment
   NODE_ENV=production
   ```

   **注意**：
   - `SHOPIFY_APP_URL` 先填一个占位符，部署后会给你真实的 URL
   - `DATABASE_URL` 使用步骤1中获取的 Supabase 连接字符串

6. **部署**
   - 点击 "Deploy"
   - 等待 2-3 分钟部署完成
   - 部署完成后，复制你的应用 URL（例如：`https://ezproduct-xxx.vercel.app`）

### 步骤4：运行数据库迁移（5分钟）

部署完成后，需要运行数据库迁移来创建表结构。

**方法1：在本地运行（推荐）**

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 设置 Supabase 数据库 URL
export DATABASE_URL="你的Supabase连接字符串"

# 运行迁移
npm run db:migrate
```

**方法2：通过 Vercel CLI 运行**

```bash
# 安装 Vercel CLI（如果还没有）
npm install -g vercel

# 登录 Vercel
vercel login

# 拉取环境变量
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
vercel env pull .env.local

# 运行迁移
npm run db:migrate
```

### 步骤5：更新环境变量（2分钟）

1. **更新 `SHOPIFY_APP_URL`**
   - 在 Vercel Dashboard → 你的项目 → Settings → Environment Variables
   - 找到 `SHOPIFY_APP_URL`
   - 更新为你的实际 Vercel URL（例如：`https://ezproduct-xxx.vercel.app`）
   - 保存

2. **重新部署**
   - 在 Vercel Dashboard → Deployments
   - 点击最新的部署右侧的 "..." → "Redeploy"
   - 或推送新的代码到 GitHub（会自动重新部署）

### 步骤6：更新 Shopify 配置（5分钟）

1. **更新 Shopify Partners Dashboard**
   - 访问 https://partners.shopify.com/
   - 登录并进入你的应用
   - 进入 "App setup" 或 "应用设置"

2. **更新 App URL**
   - **App URL**: `https://你的应用.vercel.app`
   - 保存

3. **更新 Redirect URLs**
   - **Allowed redirection URL(s)**:
     ```
     https://你的应用.vercel.app/auth/callback
     https://你的应用.vercel.app/auth/shopify/callback
     https://你的应用.vercel.app/api/auth/callback
     ```
   - 保存

4. **更新应用版本**
   - 进入 "Versions" → 你的版本
   - 更新 **App URL** 为你的 Vercel URL
   - 更新 **Redirect URLs** 为上面的三个 URL
   - 保存并发布（如果需要）

5. **更新 `shopify.app.toml`**（可选，用于本地开发）
   ```toml
   application_url = "https://你的应用.vercel.app"
   ```

### 步骤7：测试应用（5分钟）

1. **访问应用**
   - 在浏览器中打开你的 Vercel URL
   - 应该能看到应用界面（可能需要先完成 OAuth 安装）

2. **在 Shopify 后台安装应用**
   - 访问你的开发商店后台
   - 进入 "Apps" → 找到 "EZProduct"
   - 点击 "Install"
   - 完成授权

3. **测试功能**
   - 打开应用界面
   - 输入产品关键词（例如："Three Divers Resin Night Light"）
   - 点击 "Generate & Sync Product"
   - 检查产品是否成功创建

## ✅ 部署完成检查清单

- [ ] Supabase 数据库已创建
- [ ] 数据库迁移已运行（表已创建）
- [ ] Vercel 项目已部署
- [ ] 所有环境变量已配置
- [ ] Shopify Partners Dashboard 中的 URL 已更新
- [ ] Shopify 后台应用已安装
- [ ] 应用功能测试通过

## 🆘 遇到问题？

### 部署失败
- 检查 Vercel 日志：Dashboard → 你的项目 → Deployments → 点击失败的部署 → Logs
- 检查环境变量是否正确
- 检查构建命令是否正确

### 数据库连接失败
- 检查 Supabase 连接字符串是否正确
- 检查密码是否已替换 `[YOUR-PASSWORD]`
- 检查 Supabase 项目是否已创建完成

### OAuth 安装失败
- 检查 Shopify Partners Dashboard 中的 URL 是否与 Vercel URL 一致
- 等待几分钟让配置生效
- 检查 Redirect URLs 是否正确

### 应用无法访问
- 检查 Vercel 部署状态
- 查看 Vercel 日志
- 检查环境变量 `SHOPIFY_APP_URL` 是否正确

## 📝 下一步

部署完成后：
1. ✅ 测试所有功能
2. ✅ 监控 Vercel 日志
3. ✅ 准备发布到 Shopify App Store（如果需要）

## 🎉 完成！

你的应用现在已经在生产环境运行了！


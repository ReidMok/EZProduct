# 🎯 Shopify 配置完整步骤

## ✅ 当前状态

- ✅ Vercel 部署成功（状态：Ready）
- ✅ 部署 URL: `https://shopifyezproduct.vercel.app`
- ⚠️ 显示 "410 Gone" 是正常的（Shopify 嵌入式应用不能直接访问）

---

## 📋 需要完成的 3 个步骤

### 步骤 1：在 Vercel 中配置环境变量（必须先完成）

#### 1.1 进入 Vercel 设置

1. 打开：https://vercel.com/dashboard
2. 点击你的项目 `shopify_ezproduct`
3. 点击顶部 **"Settings"** 标签
4. 点击左侧 **"Environment Variables"**

#### 1.2 添加环境变量

点击 **"Add New"** 按钮，逐个添加以下 7 个变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SHOPIFY_API_KEY` | 你的 Shopify API Key | 从 Shopify Partners 获取 |
| `SHOPIFY_API_SECRET` | 你的 Shopify API Secret | 从 Shopify Partners 获取 |
| `SCOPES` | `write_products,read_products,write_product_listings,read_product_listings` | 固定值 |
| `SHOPIFY_APP_URL` | `https://shopifyezproduct.vercel.app` | 你的 Vercel URL |
| `DATABASE_URL` | 你的 PostgreSQL 连接字符串 | 见步骤 2 |
| `GEMINI_API_KEY` | 你的 Gemini API Key | 从 Google 获取 |
| `NODE_ENV` | `production` | 固定值 |

**重要：**
- 每个变量都要选择 **"Production"** 环境（勾选 Production）
- 添加完所有变量后，点击 **"Save"**
- 添加环境变量后，Vercel 会自动触发重新部署

---

### 步骤 2：配置生产数据库（Supabase）

#### 2.1 注册并创建 Supabase 项目

1. **访问 Supabase**
   - 打开：https://supabase.com
   - 点击 **"Start your project"**
   - 用 GitHub 账号登录（推荐）

2. **创建新项目**
   - 点击 **"New Project"**
   - 填写项目信息：
     - **Name**: `ezproduct`（或你喜欢的名称）
     - **Database Password**: 设置一个强密码（**保存好！**）
     - **Region**: 选择离你最近的区域（如 `Southeast Asia (Singapore)`）
   - 点击 **"Create new project"**
   - 等待 2-3 分钟项目创建完成

#### 2.2 获取数据库连接字符串

1. **进入项目设置**
   - 项目创建完成后，点击左侧 **"Settings"**（齿轮图标）
   - 点击 **"Database"**

2. **复制连接字符串**
   - 找到 **"Connection string"** 部分
   - 选择 **"URI"** 标签
   - 复制连接字符串（格式：`postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`）
   - **重要**：将 `[YOUR-PASSWORD]` 替换为你创建项目时设置的密码

   **示例：**
   ```
   postgresql://postgres:你的密码@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

#### 2.3 运行数据库迁移

在本地终端执行：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 运行迁移（将 [YOUR-PASSWORD] 替换为你的实际密码）
DATABASE_URL="postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres" npm run db:migrate
```

**如果成功，会看到：**
```
Prisma Migrate applied the following migration(s):
  migrations/
    YYYYMMDDHHMMSS_init/
      migration.sql
```

#### 2.4 将 DATABASE_URL 添加到 Vercel

1. 回到 Vercel Dashboard
2. Settings → Environment Variables
3. 添加 `DATABASE_URL` = 你的 Supabase 连接字符串（已替换密码的完整字符串）
4. 选择 "Production" 环境
5. 点击 "Save"

---

### 步骤 3：更新 Shopify Partner Dashboard（重要！）

#### 3.1 登录 Shopify Partners

1. **访问 Shopify Partners**
   - 打开：https://partners.shopify.com/
   - 登录你的 Partner 账号

#### 3.2 进入应用设置

1. **找到你的应用**
   - 点击左侧 **"应用分发"** (App Distribution)
   - 找到你的 **"EZProduct"** 应用
   - 点击应用名称进入

#### 3.3 更新 App URL

1. **进入应用版本设置**
   - 点击 **"应用版本"** (App Versions) 标签
   - 点击你的应用版本（或创建新版本）

2. **更新 App URL**
   - 找到 **"App URL"** 字段
   - 改为：`https://shopifyezproduct.vercel.app`
   - 点击 **"Save"** 保存

#### 3.4 更新 Redirect URLs（重要！）

1. **找到 Redirect URLs 设置**
   - 在同一个页面，找到 **"Allowed redirection URL(s)"** 或 **"重定向 URL"**
   - 点击 **"Add URL"** 或 **"添加 URL"**

2. **添加以下 3 个 URL**（每行一个）：

   ```
   https://shopifyezproduct.vercel.app/auth/callback
   https://shopifyezproduct.vercel.app/auth/shopify/callback
   https://shopifyezproduct.vercel.app/api/auth/callback
   ```

3. **保存更改**
   - 点击 **"Save"** 保存所有更改

#### 3.5 验证配置

确认以下信息都正确：

- ✅ **App URL**: `https://shopifyezproduct.vercel.app`
- ✅ **Redirect URLs**: 包含上述 3 个 URL
- ✅ **API Key (Client ID)**: 与 Vercel 环境变量中的 `SHOPIFY_API_KEY` 一致
- ✅ **API Secret (Client Secret)**: 与 Vercel 环境变量中的 `SHOPIFY_API_SECRET` 一致

---

## 🚀 步骤 4：在 Shopify 中安装应用

### 4.1 获取安装链接

1. **在 Shopify Partners Dashboard**
   - 进入你的应用
   - 点击 **"测试"** (Test) 或 **"开发"** (Development) 标签
   - 找到 **"测试链接"** (Test link) 或 **"Install link"**
   - 复制链接（格式：`https://partners.shopify.com/...`）

### 4.2 安装应用

1. **打开安装链接**
   - 在浏览器中打开复制的链接
   - 选择你的开发商店（如 `ezproduct-test-store.myshopify.com`）
   - 点击 **"安装"** (Install)

2. **授权应用**
   - Shopify 会显示应用请求的权限
   - 点击 **"安装应用"** (Install app) 确认授权

3. **完成安装**
   - 安装成功后，会自动跳转到应用界面
   - 你应该能看到 EZProduct 的主界面

---

## ✅ 完成后的验证

### 检查清单

- [ ] Vercel 环境变量已配置（7 个变量）
- [ ] Supabase 数据库已创建并运行迁移
- [ ] Shopify Partner Dashboard URL 已更新
- [ ] Redirect URLs 已添加
- [ ] Vercel 重新部署完成（添加环境变量后）
- [ ] 在 Shopify 中成功安装应用
- [ ] 应用界面正常显示

### 测试应用功能

1. **测试产品生成**
   - 在应用界面输入产品关键词（如："Three Divers Resin Night Light"）
   - 点击 "Generate & Sync Product"
   - 等待 AI 生成和同步完成
   - 检查 Shopify 后台是否创建了新产品

2. **检查生成的产品**
   - 进入 Shopify 后台 → **"产品"** (Products)
   - 找到刚创建的产品
   - 检查标题、描述、变体、价格等是否正确

---

## 🆘 常见问题

### 问题 1：OAuth 授权失败

**症状**：安装应用时显示 "Invalid redirect URI" 或 "OAuth error"

**解决**：
- 检查 Shopify Partner Dashboard 中的 Redirect URLs 是否完全匹配
- 确保 URL 使用 `https://`（不是 `http://`）
- 确保没有多余的空格或斜杠

### 问题 2：环境变量未生效

**症状**：应用运行但 API 调用失败

**解决**：
- 在 Vercel Dashboard 中检查环境变量是否正确添加
- 确保选择了 "Production" 环境
- 添加环境变量后，必须重新部署（Vercel 会自动触发）

### 问题 3：数据库连接失败

**症状**：应用无法保存数据

**解决**：
- 检查 `DATABASE_URL` 格式是否正确
- 确认密码已正确替换 `[YOUR-PASSWORD]`
- 在本地运行 `npm run db:migrate` 确认迁移成功

---

## 📝 快速参考

### Vercel 部署 URL
```
https://shopifyezproduct.vercel.app
```

### Shopify Partner Dashboard
```
https://partners.shopify.com/
```

### Supabase Dashboard
```
https://supabase.com/dashboard
```

---

完成这些步骤后，你的 EZProduct 应用就可以在生产环境使用了！🎉


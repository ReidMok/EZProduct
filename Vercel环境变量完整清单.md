# 📋 Vercel 环境变量完整清单

## 🔧 在 Vercel Dashboard 中配置

路径：**Vercel Dashboard → 你的项目 → Settings → Environment Variables**

## ✅ 需要配置的环境变量（按顺序）

### 1. SHOPIFY_APP_URL
```
https://shopifyezproduct.vercel.app
```
**重要**：必须与 Shopify Partner Dashboard 中的 App URL 完全一致！

---

### 2. SHOPIFY_API_KEY
```
46a6a6c60a57cd723019c930a072aa10
```
从 Shopify Partners Dashboard → 版本 "1.02 Active" → API credentials 获取

---

### 3. SHOPIFY_API_SECRET
```
shpss_eeb0172c15cc80c4d5ace4ca4cb...
```
从 Shopify Partners Dashboard → 版本 "1.02 Active" → API credentials 获取
**注意**：这是敏感信息，确保完整复制

---

### 4. SCOPES
```
write_products,read_products,write_product_listings,read_product_listings
```
**注意**：逗号分隔，没有空格

---

### 5. DATABASE_URL
```
postgresql://postgres:Reiddavis1121...@db.cugxiuizyhalmdxekged.supabase.co:5432/postgres
```
**注意**：
- 替换 `Reiddavis1121...` 为你的实际数据库密码
- 确保密码中没有特殊字符，或已正确 URL 编码
- 如果密码包含特殊字符，需要 URL 编码（例如：`&` → `%26`，`#` → `%23`，`%` → `%25`）

---

### 6. GEMINI_API_KEY
```
AIzaSyAgd7ZjC7TP8G-dcG7iW9jtlLDjM...
```
从 Google AI Studio 获取
**注意**：确保完整复制

---

### 7. NODE_ENV
```
production
```
固定值，用于生产环境

---

## 📝 配置步骤

1. **进入 Vercel Dashboard**
   - 打开你的项目：`shopifyezproduct`
   - 点击 **Settings** → **Environment Variables**

2. **逐个更新每个变量**
   - 点击变量名称
   - 点击 **Edit** 或 **Update**
   - 粘贴上面的值
   - 点击 **Save**

3. **确认所有变量**
   - 检查每个变量的值是否正确
   - 确保 `SHOPIFY_APP_URL` 是 `https://shopifyezproduct.vercel.app`（不是 `localhost`）

4. **触发重新部署**
   - 更新环境变量后，Vercel 会自动重新部署
   - 或者手动触发：**Deployments** → **Redeploy**

---

## ⚠️ 重要检查项

### 检查 1：SHOPIFY_APP_URL
- ✅ 必须是：`https://shopifyezproduct.vercel.app`
- ❌ 不能是：`https://localhost:3000`
- ❌ 不能是：`http://shopifyezproduct.vercel.app`（必须是 `https://`）

### 检查 2：SCOPES
- ✅ 必须是：`write_products,read_products,write_product_listings,read_product_listings`
- ❌ 不能有空格：`write_products, read_products`（错误）
- ✅ 正确格式：`write_products,read_products`（没有空格）

### 检查 3：DATABASE_URL
- ✅ 确保密码正确
- ✅ 确保 URL 格式正确：`postgresql://postgres:密码@主机:5432/postgres`
- ⚠️ 如果密码包含特殊字符，需要 URL 编码

---

## 🔍 验证配置

更新完成后：

1. **检查 Vercel 日志**
   - 查看是否有环境变量相关的错误
   - 查看应用是否能正常启动

2. **检查 Shopify 配置**
   - 在 Shopify Partners Dashboard → 版本 "1.02 Active"
   - 确认 App URL 与 `SHOPIFY_APP_URL` 一致
   - 确认 Redirect URLs 包含：
     - `https://shopifyezproduct.vercel.app/auth/callback`
     - `https://shopifyezproduct.vercel.app/auth/shopify/callback`
     - `https://shopifyezproduct.vercel.app/api/auth/callback`

---

## 🚀 更新完成后

1. **等待 Vercel 重新部署**（约 1-2 分钟）
2. **在 Shopify 后台重新安装应用**
3. **观察 Vercel 日志**，应该能看到 `/auth/callback` 请求

---

**更新完成后告诉我！**


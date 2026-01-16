# 🔍 诊断 OAuth 流程问题

## ⚠️ 当前问题

配置都正确，但**没有 `/auth/callback` 请求**，说明 OAuth 回调没有被触发。

## 🔍 可能的原因

### 原因 1：OAuth 流程没有正确启动

从日志看：
- ✅ `/auth/login` 请求存在（返回 200，`shopify.login result: {}`）
- ❌ **没有 `/auth/callback` 请求**

这说明 `shopify.login()` 返回了空对象 `{}`，但没有重定向到 Shopify OAuth 页面。

**可能的原因：**
- `shopify.login()` 需要 `shop` 参数才能启动 OAuth
- 如果没有 `shop` 参数，它返回空对象，不会重定向

### 原因 2：Shopify 没有回调

即使 OAuth 流程启动了，如果 Shopify 配置有问题，也不会回调。

## ✅ 解决方案

### 步骤 1：确认 OAuth 流程启动

`shopify.login()` 需要 `shop` 参数。检查：

1. **在浏览器中访问**：
   ```
   https://shopifyezproduct.vercel.app/auth/login?shop=你的商店.myshopify.com
   ```
   
   例如：
   ```
   https://shopifyezproduct.vercel.app/auth/login?shop=ezproduct-test-store.myshopify.com
   ```

2. **应该发生什么**：
   - 如果 OAuth 流程启动，会重定向到 Shopify OAuth 授权页面
   - 授权后，Shopify 会回调到 `/auth/callback`
   - 应该能在 Vercel 日志中看到 `/auth/callback` 请求

### 步骤 2：使用 Shopify 的安装链接

不要直接从 Shopify 后台安装，使用 Shopify Partners Dashboard 提供的安装链接：

1. **在 Dev Dashboard → 版本 "1.02 Active"**
2. **找到 "Installation" 卡片**
3. **点击 "Install app" 或复制安装链接**
4. **在浏览器中打开安装链接**
5. **选择你的开发商店并完成授权**

### 步骤 3：检查 Vercel 日志

安装时，在 Vercel 日志中应该看到：

1. **OAuth 启动**：
   ```
   [Auth] GET /auth/login?shop=xxx.myshopify.com
   [Auth] Redirecting to Shopify OAuth page
   ```

2. **OAuth 回调**：
   ```
   [Auth Callback] GET /auth/callback?code=xxx&hmac=xxx&shop=xxx.myshopify.com
   [Auth Callback] Successfully authenticated
   [SessionStorage] Storing session for shop: xxx.myshopify.com
   [SessionStorage] Session stored successfully
   ```

3. **重定向到应用**：
   ```
   [App Loader] GET /app
   [App Loader] Successfully authenticated. Shop: xxx.myshopify.com
   ```

## 🔍 诊断步骤

### 测试 1：手动测试 OAuth 启动

在浏览器中访问：
```
https://shopifyezproduct.vercel.app/auth/login?shop=ezproduct-test-store.myshopify.com
```

**预期结果：**
- 重定向到 Shopify OAuth 授权页面
- URL 类似：`https://ezproduct-test-store.myshopify.com/admin/oauth/authorize?...`

**如果显示空 JSON `{}`：**
- 说明 `shopify.login()` 没有正确启动 OAuth
- 需要检查 `shopify.server.ts` 配置

### 测试 2：检查 Shopify 配置

在 Shopify Partners Dashboard → 版本 "1.02 Active"：

1. **确认 App URL**：`https://shopifyezproduct.vercel.app`
2. **确认 Redirect URLs**：
   - `https://shopifyezproduct.vercel.app/auth/callback`
   - `https://shopifyezproduct.vercel.app/auth/shopify/callback`
   - `https://shopifyezproduct.vercel.app/api/auth/callback`

### 测试 3：检查 Vercel 环境变量

在 Vercel Dashboard → Settings → Environment Variables：

- `SHOPIFY_APP_URL` = `https://shopifyezproduct.vercel.app`
- `SHOPIFY_API_KEY` = `46a6a6c60a57cd723019c930a072aa10`
- `SHOPIFY_API_SECRET` = `shpss_...`（你的密钥）

## 🚨 如果还是没有回调

如果手动测试 OAuth 启动后，仍然没有回调：

1. **检查 Shopify 错误信息**：
   - 在 Shopify OAuth 授权页面，是否有错误提示？
   - 是否有 "Invalid redirect URI" 错误？

2. **检查 Vercel 日志**：
   - 是否有任何错误信息？
   - 是否有 `/auth/callback` 请求（即使返回错误）？

3. **检查网络请求**：
   - 在浏览器开发者工具 → Network 标签
   - 查看是否有对 `/auth/callback` 的请求
   - 查看请求的响应状态码和内容

---

**先执行测试 1**：在浏览器中访问 `https://shopifyezproduct.vercel.app/auth/login?shop=ezproduct-test-store.myshopify.com`，告诉我发生了什么！


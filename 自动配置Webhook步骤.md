# 自动配置 Webhook - 步骤说明

## ✅ 已完成的准备工作

1. ✅ Webhook 处理代码已创建：`app/routes/webhooks.$.ts`
2. ✅ `shopify.app.toml` 已配置 Webhook
3. ✅ 生产环境 URL 已更新为：`https://ezproduct-app.vercel.app`

## 🚀 执行自动配置步骤

### 步骤 1：登录 Shopify CLI

在终端中执行：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
shopify auth login
```

或者使用 npx（如果全局 CLI 不可用）：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
npx @shopify/cli@latest auth login
```

**操作说明：**
- 会打开浏览器，要求你登录 Shopify Partners 账户
- 登录后，CLI 会自动获取访问令牌
- 登录成功后，终端会显示 "Logged in successfully"

---

### 步骤 2：部署配置（自动注册 Webhook）

登录成功后，执行：

```bash
shopify app deploy --no-release
```

或者使用 npx：

```bash
npx @shopify/cli@latest app deploy --no-release
```

**参数说明：**
- `--no-release`：只部署配置，不发布新版本（推荐）
- 如果不加 `--no-release`，会创建新版本并发布

**这个命令会自动：**
1. 读取 `shopify.app.toml` 配置
2. 同步 URL 配置到 Dashboard
3. 同步权限配置到 Dashboard
4. **自动注册 Webhook**（`app/uninstalled` → `https://ezproduct-app.vercel.app/webhooks`）

---

### 步骤 3：验证配置

部署完成后：

1. **访问 Shopify Partners Dashboard**
   - https://partners.shopify.com/
   - 进入应用 "EZProduct"

2. **检查 Webhook 配置**
   - 进入 "App setup" → "Event subscriptions"
   - 应该能看到：
     - Event: `app/uninstalled`
     - URL: `https://ezproduct-app.vercel.app/webhooks`
     - Status: `Active`

3. **检查其他配置**
   - App URL 应该是：`https://ezproduct-app.vercel.app`
   - Redirect URLs 应该包含所有回调 URL

---

## 📋 完整命令（复制粘贴）

```bash
# 1. 进入项目目录
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 2. 登录 Shopify CLI
shopify auth login

# 3. 部署配置（自动注册 Webhook）
shopify app deploy --no-release
```

---

## ⚠️ 注意事项

1. **首次登录**：需要浏览器交互，会打开浏览器窗口
2. **权限确认**：部署时会询问是否允许更新配置，输入 `y` 确认
3. **Webhook URL**：确保 `https://ezproduct-app.vercel.app/webhooks` 可以访问（代码已部署到 Vercel）

---

## 🔍 如果遇到问题

### 问题 1：找不到 `shopify` 命令

**解决方案：**
```bash
# 使用 npx 运行
npx @shopify/cli@latest auth login
npx @shopify/cli@latest app deploy --no-release
```

### 问题 2：登录失败

**解决方案：**
- 确保已登录 Shopify Partners 账户
- 检查网络连接
- 尝试清除 CLI 缓存：`shopify auth logout` 然后重新登录

### 问题 3：部署失败

**解决方案：**
- 检查 `shopify.app.toml` 配置是否正确
- 确保 `client_id` 正确
- 查看错误信息，根据提示修复

---

## ✅ 完成后的检查清单

- [ ] Shopify CLI 已登录
- [ ] 配置已成功部署
- [ ] Webhook 已自动注册（在 Dashboard 中可见）
- [ ] App URL 已更新为生产环境 URL
- [ ] Redirect URLs 已更新
- [ ] 返回 App Store 审核页面，Webhook 错误已消失

---

## 🎯 下一步

配置完成后：
1. 返回 Shopify App Store 审核页面
2. 点击 "运行" 重新检查
3. Webhook 相关的错误应该会消失

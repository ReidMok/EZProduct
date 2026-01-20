# 解决 Cloudflare 隧道启动失败问题

## ❌ 当前错误

错误信息：`Could not start Cloudflare tunnel: unknown error.`

这是因为 Cloudflare 隧道无法启动，可能是网络问题或配置问题。

## ✅ 解决方案：使用 localhost 模式

Shopify CLI 提供了替代方案：`--use-localhost`

### 方法1：使用已更新的命令（推荐）

我已经更新了 `package.json`，现在直接运行：

```bash
npm run dev
```

这会自动使用 `--use-localhost` 参数。

### 方法2：手动使用 localhost 模式

如果方法1不行，直接在终端执行：

```bash
shopify app dev --use-localhost
```

## 📋 localhost 模式说明

使用 `--use-localhost` 后：
- ✅ 应用会在本地运行（localhost:3000）
- ✅ 不需要 Cloudflare 隧道
- ⚠️ 需要在 Shopify Partners Dashboard 中配置 localhost URL
- ⚠️ 只能在同一台电脑上访问

## 🔧 需要更新的配置

### 1. 更新 Shopify Partners Dashboard

1. 进入你的应用设置
2. 更新 **App URL** 为：`https://localhost:3000`
3. 更新 **Redirect URLs** 为：
   ```
   https://localhost:3000/auth/callback
   https://localhost:3000/auth/shopify/callback
   https://localhost:3000/api/auth/callback
   ```

### 2. 确保 shopify.app.toml 配置正确

检查 `shopify.app.toml`：
```toml
application_url = "https://localhost:3000"
```

## 🚀 启动步骤

1. **确保配置已更新**（上面两步）

2. **启动应用**：
   ```bash
   npm run dev
   ```

3. **预期结果**：
   - 应用在 `http://localhost:3000` 启动
   - 可以在浏览器中访问
   - 在 Shopify 后台安装应用

## ⚠️ 注意事项

使用 localhost 模式：
- 只能在本机访问
- 不能从其他设备访问
- 适合开发和测试

如果需要从其他设备访问，需要：
- 解决 Cloudflare 隧道问题
- 或使用 ngrok 等其他隧道工具

## 🆘 如果还是不行

尝试：

1. **检查端口是否被占用**：
   ```bash
   lsof -i :3000
   ```

2. **使用其他端口**：
   ```bash
   shopify app dev --use-localhost --port 3001
   ```

3. **检查防火墙设置**
   - 确保允许 localhost 连接

## 📝 总结

- ✅ 已更新 `package.json` 使用 `--use-localhost`
- ⏳ 需要更新 Shopify Partners Dashboard 中的 URL
- ⏳ 然后运行 `npm run dev` 启动





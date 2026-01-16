# 🔧 修复 Vercel 构建错误

## ⚠️ 错误

```
Cannot find module '@remix-run/dev'
```

## ✅ 解决方案

### 方案1：修改 Vercel 构建设置（推荐）

在 Vercel Dashboard 中：

1. **进入项目设置**
   - 点击你的项目
   - 进入 "Settings" → "General"

2. **修改 Install Command**
   - 找到 "Install Command"
   - 改为：`npm install --include=dev`
   - 或：`npm ci --include=dev`

3. **修改 Build Command**
   - 找到 "Build Command"
   - 改为：`npm run build && npm run db:generate`
   - 确保 `@remix-run/dev` 已安装

4. **重新部署**
   - 点击 "Redeploy"

### 方案2：将 @remix-run/dev 移到 dependencies

如果方案1不行，修改 `package.json`：

```json
{
  "dependencies": {
    "@remix-run/dev": "^2.8.0",
    ...
  },
  "devDependencies": {
    ...
  }
}
```

但这会增加生产环境的包大小，不推荐。

### 方案3：使用 Vercel 的 Remix 预设

Vercel 应该自动检测 Remix，但可能需要：

1. **确保 Framework Preset 是 Remix**
   - 在项目设置中检查
   - 如果不是，改为 Remix

2. **使用默认构建命令**
   - Build Command: `npm run build`
   - Install Command: `npm install`

## 🎯 推荐操作

### 在 Vercel Dashboard 中：

1. **Settings** → **General**
2. **Install Command**: 改为 `npm install --include=dev`
3. **Build Command**: 改为 `npm run build && npm run db:generate`
4. **保存**
5. **Redeploy**

## ✅ 完成！

修复后重新部署，应该能成功构建。


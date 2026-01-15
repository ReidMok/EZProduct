# 🚀 Hostinger 部署配置指南

## ⚠️ 问题说明

Hostinger 显示"不受支持的框架"，因为 Remix 不在自动检测列表中。需要手动配置。

## ✅ 解决方案：手动配置部署

### 步骤1：忽略警告，继续配置

即使显示警告，也可以继续。Hostinger 允许手动配置构建和启动命令。

### 步骤2：在 Hostinger 中配置以下设置

#### 基本设置：

1. **项目名称**：`EZProduct`

2. **分支**：`main`

3. **Node.js 版本**：选择 **18.x** 或 **20.x**

4. **构建命令**：
   ```bash
   npm install && npm run build && npm run db:generate
   ```

5. **启动命令**：
   ```bash
   npm start
   ```

6. **工作目录**：`/`（根目录）

7. **端口**：`3000`（Hostinger 可能会自动分配，检查实际端口）

### 步骤3：配置环境变量

在 Hostinger 控制面板的环境变量部分，添加：

```
SHOPIFY_API_KEY=你的Shopify_API_Key
SHOPIFY_API_SECRET=你的Shopify_API_Secret
SCOPES=write_products,read_products,write_product_listings,read_product_listings
SHOPIFY_APP_URL=https://你的域名.com
DATABASE_URL=你的PostgreSQL连接字符串
GEMINI_API_KEY=你的Gemini_API_Key
NODE_ENV=production
PORT=3000
```

### 步骤4：数据库配置

#### 选项1：使用 Hostinger 提供的 PostgreSQL

1. 在 Hostinger 控制面板中创建 PostgreSQL 数据库
2. 获取连接字符串
3. 更新 `DATABASE_URL` 环境变量

#### 选项2：使用 Supabase（推荐）

1. 创建 Supabase 项目
2. 获取连接字符串
3. 在 Hostinger 环境变量中设置 `DATABASE_URL`

### 步骤5：运行数据库迁移

部署后，需要通过 SSH 或 Hostinger 的终端运行：

```bash
npm run db:migrate
```

或者添加一个部署后脚本。

## 📝 重要配置文件

### package.json 中的脚本

确保 `package.json` 中有这些脚本：

```json
{
  "scripts": {
    "build": "remix vite:build",
    "start": "remix-serve build/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "postinstall": "prisma generate"
  }
}
```

### 确保文件已提交到 GitHub

确保以下文件已推送到 GitHub：
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `vite.config.ts`
- ✅ `remix.config.js`
- ✅ `prisma/schema.prisma`
- ✅ `app/` 目录
- ✅ `.gitignore`

## 🔧 如果部署失败

### 检查1：查看构建日志

在 Hostinger 控制面板中查看构建日志，检查错误信息。

### 检查2：确认 Node.js 版本

确保 Hostinger 使用 Node.js 18 或更高版本。

### 检查3：确认端口配置

Hostinger 可能会分配不同的端口，检查实际端口并更新环境变量。

### 检查4：确认数据库连接

确保 `DATABASE_URL` 正确，并且数据库已创建。

## 🎯 部署流程总结

1. ✅ 在 Hostinger 中选择 "Node.js 网络应用程序"
2. ✅ 选择 GitHub 仓库 `ReidMok/EZProduct`
3. ⚠️ 忽略"不受支持的框架"警告
4. ✅ 手动配置：
   - 构建命令：`npm install && npm run build && npm run db:generate`
   - 启动命令：`npm start`
   - Node.js 版本：18.x 或 20.x
5. ✅ 配置环境变量
6. ✅ 部署
7. ✅ 运行数据库迁移（通过 SSH 或终端）
8. ✅ 更新 Shopify 配置中的 App URL

## 📝 注意事项

- Hostinger 可能不支持某些 Remix 特性
- 如果遇到问题，考虑使用 Vercel（对 Remix 支持更好）
- 确保所有依赖都在 `package.json` 中
- 确保 `.gitignore` 正确配置，不会提交敏感文件


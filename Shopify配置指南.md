# Shopify Partners Dashboard 配置指南

## 📋 在Shopify Partners中需要完成的步骤

### 第一步：创建应用

1. **进入应用分发页面**
   - 在左侧菜单点击 **"应用分发" (App Distribution)**
   - 或访问：https://partners.shopify.com/organizations/你的组织ID/apps

2. **创建新应用**
   - 点击 **"创建应用" (Create app)** 按钮
   - 选择 **"创建自定义应用" (Create custom app)**
   - 填写应用信息：
     - **应用名称**: `EZProduct` 或你喜欢的名称
     - **应用URL**: 暂时可以填 `https://localhost:3000`（开发环境）
     - **重定向URL**: `https://localhost:3000/auth/callback`

3. **保存应用**
   - 点击创建后，系统会生成应用

### 第二步：获取API凭证

1. **进入应用设置**
   - 在应用列表中点击你刚创建的应用
   - 进入 **"API credentials"** 或 **"API凭证"** 页面

2. **复制凭证**
   - **Client ID (客户端ID)**: 复制这个值
   - **Client secret (客户端密钥)**: 复制这个值
   - **API Key**: 通常和Client ID相同
   - **API Secret**: 通常和Client Secret相同

3. **填入到项目**
   - 将 `Client ID` 填入 `shopify.app.toml` 的 `client_id`
   - 将 `Client Secret` 填入 `.env` 文件的 `SHOPIFY_API_SECRET`
   - 将 `API Key` 填入 `.env` 文件的 `SHOPIFY_API_KEY`

### 第三步：配置应用权限（Scopes）

1. **进入应用设置**
   - 在应用页面找到 **"App setup"** 或 **"应用设置"**

2. **配置权限范围**
   - 找到 **"Scopes"** 或 **"权限范围"**
   - 确保勾选以下权限：
     - ✅ `write_products` - 写入产品
     - ✅ `read_products` - 读取产品
     - ✅ `write_product_listings` - 写入产品列表
     - ✅ `read_product_listings` - 读取产品列表

3. **保存设置**

### 第四步：配置应用URL和重定向URL

1. **进入应用设置**
   - 在 **"App setup"** 页面

2. **配置URL**
   - **App URL (应用URL)**: 
     - 开发环境：`https://localhost:3000`
     - 或使用ngrok生成的URL（运行 `npm run dev` 时会自动生成）
   
   - **Allowed redirection URL(s) (允许的重定向URL)**:
     ```
     https://localhost:3000/auth/callback
     https://localhost:3000/auth/shopify/callback
     https://localhost:3000/api/auth/callback
     ```
     如果使用ngrok，替换为ngrok的URL

3. **保存设置**

### 第五步：更新项目配置文件

1. **更新 `shopify.app.toml`**
   ```toml
   name = "EZProduct"
   client_id = "你的Client_ID"  # 从第二步获取
   application_url = "https://localhost:3000"  # 或你的ngrok URL
   ```

2. **更新 `.env` 文件**
   ```env
   SHOPIFY_API_KEY=你的API_Key
   SHOPIFY_API_SECRET=你的API_Secret
   SHOPIFY_APP_URL=https://localhost:3000
   ```

### 第六步：创建开发商店（可选但推荐）

1. **创建开发商店**
   - 在左侧菜单点击 **"商店" (Stores)**
   - 点击 **"创建商店" (Create Store)**
   - 选择 **"开发商店" (Development Store)**
   - 填写商店信息并创建

2. **在开发商店中测试应用**
   - 运行 `npm run dev` 启动应用
   - Shopify CLI会自动打开浏览器
   - 选择你的开发商店进行安装测试

## 📝 配置检查清单

完成以下所有项：

- [ ] 在Shopify Partners中创建了应用
- [ ] 获取了Client ID和Client Secret
- [ ] 配置了应用权限（write_products, read_products等）
- [ ] 配置了App URL和重定向URL
- [ ] 更新了 `shopify.app.toml` 中的 `client_id`
- [ ] 更新了 `.env` 文件中的API凭证
- [ ] 创建了开发商店（可选）

## 🔍 重要提示

### 开发环境URL配置

**选项1：使用localhost（推荐用于本地开发）**
```
App URL: https://localhost:3000
重定向URL: https://localhost:3000/auth/callback
```

**选项2：使用ngrok（如果需要外部访问）**
- 运行 `npm run dev` 时，Shopify CLI会自动创建ngrok隧道
- 复制ngrok生成的URL
- 在Shopify Partners Dashboard中更新为ngrok URL

### 生产环境URL配置

部署到生产环境后，需要：
1. 更新App URL为你的生产域名
2. 更新所有重定向URL为生产域名
3. 在 `.env` 中更新 `SHOPIFY_APP_URL`

## 🆘 常见问题

### Q: 找不到API凭证在哪里？
A: 
1. 进入你的应用页面
2. 点击 **"API credentials"** 或 **"API凭证"**
3. 如果看不到，可能需要先完成应用的基本设置

### Q: Client ID和API Key有什么区别？
A: 在大多数情况下它们是相同的，都指向同一个值。使用Client ID即可。

### Q: 重定向URL配置错误怎么办？
A: 
- 确保URL格式正确（包含https://）
- 确保URL与 `shopify.app.toml` 中的配置一致
- 如果有多个重定向URL，每个都要单独添加

### Q: 权限配置在哪里？
A: 
- 在应用的 **"App setup"** 页面
- 找到 **"Scopes"** 或 **"权限范围"** 部分
- 勾选需要的权限并保存

## 📞 下一步

完成Shopify配置后：
1. ✅ 更新项目的 `.env` 文件
2. ✅ 更新 `shopify.app.toml` 文件
3. ✅ 运行 `npm run dev` 测试应用
4. ✅ 在开发商店中安装应用进行测试





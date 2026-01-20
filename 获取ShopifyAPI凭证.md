# 获取 Shopify 应用 API 凭证 - 正确步骤

## ❌ 不是这个页面

你看到的"创建合作伙伴 API 客户端"（Partner API Client）**不是**我们需要的。

这个用于：
- 访问Partner级别的API
- 管理收入、应用等Partner功能

## ✅ 正确的步骤：获取应用API凭证

### 第一步：进入应用分发页面

1. 在左侧菜单点击 **"应用分发" (App Distribution)**
   - 图标是一个加号和方块的组合
   - 或者直接访问：https://partners.shopify.com/organizations/你的组织ID/apps

### 第二步：创建应用（如果还没有）

1. 点击 **"创建应用" (Create app)** 按钮
2. 选择 **"创建自定义应用" (Create custom app)**
3. 填写应用信息：
   - **应用名称**: `EZProduct`
   - **应用URL**: 暂时填 `https://localhost:3000`（开发环境）
4. 点击创建

### 第三步：进入应用设置

1. 在应用列表中，点击你刚创建的应用（或现有应用）
2. 进入应用详情页面

### 第四步：找到API凭证

在应用页面中，找到以下任一位置：

**选项1：API credentials 标签**
- 在应用页面顶部可能有多个标签
- 点击 **"API credentials"** 或 **"API凭证"** 标签

**选项2：App setup 页面**
- 点击 **"App setup"** 或 **"应用设置"**
- 在页面中找到 **"API credentials"** 部分

**选项3：直接查看**
- 在应用页面的侧边栏或顶部导航中查找 **"API credentials"**

### 第五步：复制API凭证

在API credentials页面，你会看到：

1. **Client ID** 或 **API Key**
   - 这是一个字符串（例如：`abc123def456...`）
   - 复制这个值

2. **Client Secret** 或 **API Secret**
   - 这也是一个字符串
   - 点击"显示"或"Reveal"按钮查看
   - 复制这个值

## 📝 如何使用这些凭证

### 1. 更新 shopify.app.toml

```toml
client_id = "你的Client_ID"  # 从API credentials获取
```

### 2. 更新 .env 文件

```env
SHOPIFY_API_KEY=你的Client_ID或API_Key
SHOPIFY_API_SECRET=你的Client_Secret或API_Secret
```

## 🎯 快速导航路径

如果你现在在"设置"页面：

1. 点击左侧菜单的 **"应用分发" (App Distribution)**
2. 点击 **"创建应用"** 或选择现有应用
3. 进入应用页面
4. 找到 **"API credentials"** 或 **"App setup"**
5. 复制 Client ID 和 Client Secret

## ⚠️ 重要提示

- **Client ID** 和 **API Key** 通常是同一个值
- **Client Secret** 和 **API Secret** 通常是同一个值
- 如果看不到Secret，可能需要点击"显示"或"Reveal"按钮
- 这些凭证是敏感信息，不要分享给他人

## 🔍 如果找不到API credentials

1. 确保你已经创建了应用（不是Partner API Client）
2. 确保你在应用详情页面，不是Partner设置页面
3. 查看应用页面的所有标签和菜单项
4. 可能需要先完成应用的基本设置

## 📞 下一步

获取到API凭证后：
1. 填入 `shopify.app.toml` 的 `client_id`
2. 填入 `.env` 文件的 `SHOPIFY_API_KEY` 和 `SHOPIFY_API_SECRET`
3. 然后就可以启动应用了！





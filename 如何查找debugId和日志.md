# 如何查找 debugId 和日志（详细步骤）

## 第一步：在 Shopify Admin 页面找到 debugId

### 1.1 打开你的 Shopify App
1. 登录 Shopify Admin（你的店铺后台）
2. 在左侧菜单找到 **Apps** → **EZProduct**（或你安装的应用名）
3. 如果页面显示错误，你会看到**红色 Banner**（错误提示框）

### 1.2 找到 debugId
- **红色 Banner 的位置**：在页面最上方，标题是 "Error"
- **debugId 的格式**：错误信息里会包含类似这样的内容：
  ```
  失败（debugId=abcd1234）：Failed to sync product to Shopify...
  ```
  或者：
  ```
  Error: 失败（debugId=xyz7890）：Shopify GraphQL errors: ...
  ```

### 1.3 复制 debugId
- 找到 `debugId=` 后面的那一串字符（例如：`abcd1234` 或 `xyz7890`）
- **完整复制**：把整个错误信息都复制下来（包括 debugId 和后面的错误描述）

---

## 第二步：在 Vercel 找到对应的日志

### 2.1 打开 Vercel Dashboard
1. 打开浏览器，访问：https://vercel.com
2. 登录你的 Vercel 账号
3. 找到你的项目（应该是 `shopifyezproduct` 或类似的名字）

### 2.2 进入部署页面
1. 在项目页面，点击顶部导航栏的 **"Deployments"**（部署）
2. 找到**最新的部署**（最上面那个，状态应该是 "Ready" 或 "Building"）
3. 点击这个部署的**任意位置**（会进入部署详情页）

### 2.3 打开日志（Logs）
在部署详情页，你会看到几个标签页：
- **Overview**（概览）
- **Build Logs**（构建日志）
- **Runtime Logs**（运行时日志）← **点这个！**

### 2.4 搜索 debugId
1. 在 **Runtime Logs** 页面，你会看到一个**搜索框**（通常在右上角，写着 "Search logs" 或 "Filter logs"）
2. 把你刚才复制的 **debugId**（例如：`abcd1234`）粘贴到搜索框
3. 按回车或点击搜索

### 2.5 找到相关日志段
搜索后，日志会高亮显示包含这个 debugId 的行。你需要找到：

**关键日志段（从这行开始）：**
```
[App Action] debugId: abcd1234
```

**到这些行（包含这些关键词）：**
- `[App Action] Step 1: Generating product with AI...`
- `[App Action] Step 2: Syncing to Shopify...`
- `[Shopify Sync][debugId=abcd1234] Step 1: Creating product...`
- `[Shopify Sync][debugId=abcd1234] ========== FULL REQUEST DETAILS ==========`
- `[Shopify Sync][debugId=abcd1234] ========== FULL RESPONSE DETAILS ==========`
- `[Shopify Sync][debugId=abcd1234] User Errors:`
- `[Shopify Sync][debugId=abcd1234] GraphQL Errors:`

---

## 第三步：复制日志内容

### 3.1 选择日志范围
找到包含 debugId 的日志段后，**从上往下复制**：

1. **开始行**：找到 `[App Action] debugId: xxxx` 这一行
2. **结束行**：找到最后一个包含 `[Shopify Sync][debugId=xxxx]` 或 `[App Action] ========== ACTION COMPLETED` 的行

### 3.2 复制方法
- **方法一（推荐）**：在 Vercel 日志页面，用鼠标**拖选**从开始行到结束行的所有内容，然后 `Ctrl+C`（Windows）或 `Cmd+C`（Mac）复制
- **方法二**：如果日志太长，可以分几次复制：
  - 先复制 `[App Action] debugId:` 到 `[App Action] Step 2: Syncing...` 这一段
  - 再复制 `[Shopify Sync][debugId=...]` 开头的所有行

### 3.3 需要复制的内容（最少需要这些）
至少包含以下关键信息：
```
[App Action] debugId: xxxx
[App Action] Step 1: Generating product with AI...
[App Action] AI generation completed. Title: ...
[App Action] Step 2: Syncing to Shopify...
[Shopify Sync][debugId=xxxx] Step 1: Creating product...
[Shopify Sync][debugId=xxxx] ========== FULL REQUEST DETAILS ==========
[Shopify Sync][debugId=xxxx] Variables: ...
[Shopify Sync][debugId=xxxx] ========== FULL RESPONSE DETAILS ==========
[Shopify Sync][debugId=xxxx] Response (full): ...
[Shopify Sync][debugId=xxxx] User Errors: ...（如果有）
[Shopify Sync][debugId=xxxx] GraphQL Errors: ...（如果有）
```

---

## 第四步：发给我

把以下**两样东西**发给我：

1. **页面上的错误信息**（包含 debugId 的完整红色 Banner 内容）
2. **Vercel 日志**（包含 debugId 的那一段，至少 20-50 行）

**示例格式：**
```
页面错误：
失败（debugId=abcd1234）：Failed to sync product to Shopify (400): Shopify API user errors: [input.productOptions] Invalid format

Vercel 日志：
[App Action] debugId: abcd1234
[App Action] Step 1: Generating product with AI...
[App Action] AI generation completed. Title: Minimalist Ceramic Coffee Mug
[App Action] Step 2: Syncing to Shopify...
[Shopify Sync][debugId=abcd1234] Step 1: Creating product...
[Shopify Sync][debugId=abcd1234] ========== FULL REQUEST DETAILS ==========
[Shopify Sync][debugId=abcd1234] Variables: {"input":{"title":"...","productOptions":[...]}}
[Shopify Sync][debugId=abcd1234] ========== FULL RESPONSE DETAILS ==========
[Shopify Sync][debugId=abcd1234] Response (full): {"data":{"productCreate":{"userErrors":[{"field":["input","productOptions"],"message":"Invalid format"}]}}}
[Shopify Sync][debugId=abcd1234] User Errors: [{"field":["input","productOptions"],"message":"Invalid format"}]
```

---

## 常见问题

### Q1: 页面没有显示 debugId？
- **可能原因**：错误发生在更早的阶段（比如 AI 生成失败）
- **解决方法**：直接复制红色 Banner 里的完整错误信息发给我

### Q2: Vercel 日志里搜不到 debugId？
- **可能原因**：
  - debugId 还没生成（错误发生在 action 之前）
  - 日志还没刷新（等 10-30 秒再搜）
  - 搜索框输入有误（检查是否有多余空格）
- **解决方法**：
  - 直接搜索 `[App Action]` 或 `[Shopify Sync]`
  - 找到最近一次失败的请求日志
  - 复制包含错误的那一段

### Q3: 日志太长，不知道复制哪一段？
- **解决方法**：复制**最近一次失败**的完整日志段，从 `[App Action] ========== ACTION STARTED ==========` 开始，到 `[App Action] ========== ACTION COMPLETED WITH ERROR ==========` 结束

### Q4: Vercel 没有 Runtime Logs 标签？
- **可能原因**：部署还在构建中，或者项目配置问题
- **解决方法**：
  - 等部署完成（状态变成 "Ready"）
  - 或者去 **Functions** 标签页查看 serverless function 日志
  - 或者直接在项目主页的 **Logs** 标签查看

---

## 快速检查清单

在发给我之前，确认你有：
- [ ] 页面上的错误信息（包含 debugId，如果有）
- [ ] Vercel Runtime Logs 里包含 debugId 的那一段日志（至少 20 行）
- [ ] 日志里包含 `[Shopify Sync]` 的请求和响应详情

有了这些，我就能准确定位问题并给你修复方案！


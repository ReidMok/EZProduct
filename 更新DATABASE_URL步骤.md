# 🔧 更新 DATABASE_URL 步骤

## ⚠️ 当前状态

从 Vercel 环境变量截图看，`DATABASE_URL` 还是占位符：
```
postgresql://postgres: [YOUR-PASS...
```

需要替换为实际的 Supabase 连接字符串。

---

## 📋 步骤 1：创建 Supabase 数据库

### 1.1 注册 Supabase

1. **访问 Supabase**
   - 打开：https://supabase.com
   - 点击 **"Start your project"**
   - 用 GitHub 账号登录（推荐）

### 1.2 创建新项目

1. **点击 "New Project"**
2. **填写项目信息**：
   - **Name**: `ezproduct`（或你喜欢的名称）
   - **Database Password**: 设置一个强密码（**保存好！**）
   - **Region**: 选择离你最近的区域（如 `Southeast Asia (Singapore)`）
3. **点击 "Create new project"**
4. **等待 2-3 分钟**项目创建完成

---

## 📋 步骤 2：获取连接字符串

### 2.1 进入数据库设置

1. **项目创建完成后**
   - 点击左侧 **"Settings"**（齿轮图标）
   - 点击 **"Database"**

### 2.2 复制连接字符串

1. **找到 "Connection string" 部分**
2. **选择 "URI" 标签**
3. **复制连接字符串**

   格式示例：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

4. **重要**：将 `[YOUR-PASSWORD]` 替换为你创建项目时设置的密码

   **最终格式应该是：**
   ```
   postgresql://postgres:你的实际密码@db.xxx.supabase.co:5432/postgres
   ```

   **示例：**
   ```
   postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

---

## 📋 步骤 3：运行数据库迁移

在本地终端执行：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 运行迁移（将整个连接字符串替换为你的实际字符串）
DATABASE_URL="postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres" npm run db:migrate
```

**如果成功，会看到：**
```
Prisma Migrate applied the following migration(s):
  migrations/
    YYYYMMDDHHMMSS_init/
      migration.sql
```

**如果失败，检查：**
- 密码是否正确
- 连接字符串格式是否正确
- Supabase 项目是否已创建完成

---

## 📋 步骤 4：更新 Vercel 环境变量

### 4.1 编辑 DATABASE_URL

1. **回到 Vercel Dashboard**
   - 打开：https://vercel.com/dashboard
   - 进入你的项目 `shopify_ezproduct`
   - Settings → Environment Variables

2. **找到 `DATABASE_URL`**
   - 点击右侧的 **"..."** 菜单
   - 选择 **"Edit"**

3. **更新值**
   - 删除旧的占位符值
   - 粘贴完整的 Supabase 连接字符串（已替换密码的）
   - 确保格式正确，没有多余空格

4. **保存**
   - 点击 **"Save"**
   - Vercel 会自动触发重新部署

---

## ✅ 验证

### 检查清单

- [ ] Supabase 项目已创建
- [ ] 连接字符串已获取并替换密码
- [ ] 本地数据库迁移成功
- [ ] Vercel 中的 `DATABASE_URL` 已更新为完整连接字符串
- [ ] Vercel 重新部署完成

### 验证连接

迁移成功后，你可以：

1. **检查 Supabase Dashboard**
   - 进入 Supabase 项目
   - 点击左侧 **"Table Editor"**
   - 应该能看到 `Shop` 和 `ProductGeneration` 两个表

2. **检查 Vercel 部署**
   - 在 Vercel Dashboard 查看最新部署
   - 应该成功构建（没有数据库连接错误）

---

## 🆘 常见问题

### 问题 1：迁移失败 "password authentication failed"

**原因**：密码没有正确替换 `[YOUR-PASSWORD]`

**解决**：
- 检查连接字符串中的密码是否正确
- 确保密码没有特殊字符需要 URL 编码
- 如果密码包含特殊字符，可能需要 URL 编码（如 `@` 变成 `%40`）

### 问题 2：迁移失败 "connection refused"

**原因**：Supabase 项目可能还在创建中

**解决**：
- 等待 2-3 分钟让项目完全创建
- 检查 Supabase Dashboard 是否显示 "Active" 状态

### 问题 3：迁移失败 "relation already exists"

**原因**：数据库表已存在

**解决**：
- 这是正常的，说明迁移已经运行过
- 可以继续下一步

---

## 📝 下一步

完成 `DATABASE_URL` 更新后：

1. ✅ 等待 Vercel 重新部署完成
2. ✅ 更新 Shopify Partner Dashboard（见 `Shopify配置完整步骤.md`）
3. ✅ 在 Shopify 中安装应用

---

完成这些步骤后，你的应用就可以正常使用数据库了！🎉


# 📝 如何在 Supabase SQL Editor 中执行 SQL

## 🎯 步骤 1：打开 Supabase Dashboard

1. **访问**：https://supabase.com/dashboard
2. **登录**你的账户
3. **选择你的项目**：`CURSOR-SHOPIFY` 或 `EZProduct`

---

## 🎯 步骤 2：进入 SQL Editor

1. **在左侧菜单**，找到 **"SQL Editor"**（SQL 编辑器）
   - 图标是一个数据库/代码符号
   - 或者直接访问：https://supabase.com/dashboard/project/你的项目ID/sql/new

2. **点击 "SQL Editor"**

---

## 🎯 步骤 3：打开 SQL 文件

1. **在你的电脑上**，打开文件：
   ```
   /Users/Zhuanz/cursor/resinmemory_product/ezproduct/supabase_create_session_table.sql
   ```

2. **全选并复制**文件中的所有内容（`Cmd + A` 然后 `Cmd + C`）

---

## 🎯 步骤 4：粘贴到 SQL Editor

1. **在 Supabase SQL Editor 中**，你会看到一个大的代码编辑框
2. **清空编辑框**（如果有示例代码）
3. **粘贴**你刚才复制的 SQL 内容（`Cmd + V`）

---

## 🎯 步骤 5：执行 SQL

1. **检查 SQL 内容**是否正确粘贴
2. **点击右下角的 "Run" 按钮**（或按 `Cmd + Enter` / `Ctrl + Enter`）
3. **等待执行完成**（通常几秒钟）

---

## 🎯 步骤 6：确认执行成功

执行成功后，你会看到：

1. **底部显示 "Success"** 或类似的成功消息
2. **左侧的 "Table Editor"** 中应该能看到新的 **"Session"** 表
3. **或者点击左侧菜单的 "Table Editor"**，确认 `Session` 表已创建

---

## 📋 SQL 文件内容预览

你应该粘贴的内容大致如下：

```sql
-- 创建 Session 表
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "state" TEXT,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "scope" TEXT,
  "expires" TIMESTAMP(3),
  "accessToken" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "Session"("shop");
```

---

## ⚠️ 注意事项

1. **如果表已存在**：SQL 使用了 `CREATE TABLE IF NOT EXISTS`，所以不会报错
2. **如果执行失败**：检查错误信息，可能是权限问题或语法错误
3. **执行后**：表会立即创建，不需要重启或等待

---

## 🔍 验证表是否创建成功

1. **在 Supabase Dashboard** → **Table Editor**
2. **查看左侧表列表**，应该能看到：
   - `Shop` 表（已存在）
   - `ProductGeneration` 表（已存在）
   - **`Session` 表**（新创建的）✅

---

## 🚀 执行完成后

执行完 SQL 后，继续下一步：
1. **推送代码到 GitHub**
2. **等待 Vercel 重新部署**
3. **在 Shopify 后台重新安装应用**

---

**执行完成后告诉我结果！**


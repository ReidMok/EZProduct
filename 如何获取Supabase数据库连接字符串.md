# 🔍 如何获取 Supabase DATABASE_URL

## 📍 步骤 1：登录 Supabase Dashboard

1. **访问**：https://supabase.com/dashboard
2. **登录**你的账户
3. **选择你的项目**：`CURSOR-SHOPIFY` 或 `EZProduct`

---

## 📍 步骤 2：进入项目设置

1. **在左侧菜单**，点击 **"Project Settings"**（项目设置）
   - 图标是一个齿轮 ⚙️
   - 或者直接访问：https://supabase.com/dashboard/project/你的项目ID/settings/database

---

## 📍 步骤 3：找到数据库连接字符串

在 **"Project Settings"** 页面：

1. **点击 "Database"** 标签（在左侧或顶部）
2. **找到 "Connection string"** 或 **"Connection pooling"** 部分

你会看到几个选项：

### 选项 1：Session Pooler（推荐用于生产环境）
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 选项 2：Direct Connection（直接连接）
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 选项 3：Transaction Pooler
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

---

## 📍 步骤 4：复制连接字符串

1. **点击连接字符串旁边的复制按钮**（📋 图标）
2. **或者手动复制**整个字符串

---

## 📍 步骤 5：替换密码

连接字符串中的 `[password]` 需要替换为你的实际数据库密码：

1. **如果你记得密码**：
   - 直接替换 `[password]` 为你的密码
   - 例如：`postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres`

2. **如果你不记得密码**：
   - 在 Supabase Dashboard → **Project Settings** → **Database**
   - 找到 **"Database password"** 部分
   - 点击 **"Reset database password"**（重置数据库密码）
   - 设置一个新密码（建议使用简单密码，避免特殊字符）
   - 然后替换到连接字符串中

---

## 📍 步骤 6：URL 编码特殊字符（如果需要）

如果密码包含特殊字符，需要 URL 编码：

| 字符 | URL 编码 |
|------|----------|
| `&`  | `%26`    |
| `#`  | `%23`    |
| `%`  | `%25`    |
| `?`  | `%3F`    |
| `=`  | `%3D`    |
| `+`  | `%2B`    |
| `@`  | `%40`    |
| `:`  | `%3A`    |
| `/`  | `%2F`    |
| ` `  | `%20`    |

**示例**：
- 密码：`&hmB9!2_UK#7%?8`
- URL 编码后：`%26hmB9%212_UK%23%257%3F8`

---

## 📍 步骤 7：完整的 DATABASE_URL 格式

最终格式应该是：
```
postgresql://postgres:你的密码@db.cugxiuizyhalmdxekged.supabase.co:5432/postgres
```

**你的项目信息**（从之前的对话）：
- **项目 ID**：`cugxiuizyhalmdxekged`
- **主机**：`db.cugxiuizyhalmdxekged.supabase.co`
- **端口**：`5432`
- **数据库名**：`postgres`
- **用户名**：`postgres`

---

## 📍 步骤 8：在 Vercel 中配置

1. **进入 Vercel Dashboard**
2. **选择你的项目**：`shopifyezproduct`
3. **Settings** → **Environment Variables**
4. **找到 `DATABASE_URL`**
5. **点击 Edit**
6. **粘贴完整的连接字符串**
7. **点击 Save**

---

## 🔍 快速查找路径

**方法 1：通过 Dashboard**
```
Supabase Dashboard → 你的项目 → Project Settings → Database → Connection string
```

**方法 2：直接访问**
```
https://supabase.com/dashboard/project/你的项目ID/settings/database
```

---

## ⚠️ 注意事项

1. **使用 Session Pooler**（推荐）：
   - 更适合生产环境
   - 连接字符串格式：`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

2. **密码安全**：
   - 不要在代码中硬编码密码
   - 使用环境变量存储
   - 定期更换密码

3. **特殊字符**：
   - 如果密码包含特殊字符，建议重置为简单密码
   - 或者使用 URL 编码

---

**找到 DATABASE_URL 后，告诉我完整的连接字符串（可以隐藏密码），我帮你确认格式是否正确！**


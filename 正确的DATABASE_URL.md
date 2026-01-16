# ✅ 正确的 DATABASE_URL 配置

## 🔍 密码确认

你的实际密码是：`&hmB9!2_UK#7%?8`（**不包含方括号**）

## ⚠️ 重要：密码需要 URL 编码

你的密码包含特殊字符，在 URL 中必须进行 URL 编码：

| 字符 | URL 编码 |
|------|----------|
| `&` | `%26` |
| `!` | `%21` |
| `#` | `%23` |
| `%` | `%25` |
| `?` | `%3F` |

## ✅ 正确的连接字符串

### 原始密码
```
&hmB9!2_UK#7%?8
```

### URL 编码后的密码
```
%26hmB9%212_UK%23%257%3F8
```

### 完整的 DATABASE_URL（用于 Vercel）
```
postgresql://postgres:%26hmB9%212_UK%23%257%3F8@db.cugxiuizyhalmdxekged.supabase.co:5432/postgres
```

## 📋 更新步骤

### 在 Vercel 中更新 DATABASE_URL

1. **打开 Vercel Dashboard**
   - 进入你的项目 `shopify_ezproduct`
   - Settings → Environment Variables

2. **编辑 DATABASE_URL**
   - 找到 `DATABASE_URL`
   - 点击右侧的 **"..."** 菜单
   - 选择 **"Edit"**

3. **更新值**
   - 删除旧值
   - 粘贴以下完整连接字符串：
     ```
     postgresql://postgres:%26hmB9%212_UK%23%257%3F8@db.cugxiuizyhalmdxekged.supabase.co:5432/postgres
     ```

4. **保存**
   - 点击 **"Save"**
   - Vercel 会自动触发重新部署

## 🔍 验证连接

更新后，在本地终端测试连接：

```bash
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 使用 URL 编码后的连接字符串
DATABASE_URL="postgresql://postgres:%26hmB9%212_UK%23%257%3F8@db.cugxiuizyhalmdxekged.supabase.co:5432/postgres" npm run db:migrate
```

### 如果成功：
你会看到：
```
Prisma Migrate applied the following migration(s):
  migrations/
    YYYYMMDDHHMMSS_init/
      migration.sql
```

### 如果失败：
- 检查密码是否正确
- 检查 URL 编码是否正确
- 检查 Supabase 项目是否已创建完成

## 📝 密码编码对照表

**原始密码：** `&hmB9!2_UK#7%?8`

**逐个字符编码：**
- `&` → `%26`
- `h` → `h`（不需要编码）
- `m` → `m`
- `B` → `B`
- `9` → `9`
- `!` → `%21`
- `2` → `2`
- `_` → `_`（不需要编码）
- `U` → `U`
- `K` → `K`
- `#` → `%23`
- `7` → `7`
- `%` → `%25`
- `?` → `%3F`
- `8` → `8`

**最终编码：** `%26hmB9%212_UK%23%257%3F8`

---

## ✅ 完成

更新 Vercel 中的 `DATABASE_URL` 后，等待自动重新部署完成，然后继续 Shopify 配置。


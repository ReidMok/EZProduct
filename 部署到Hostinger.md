# 🚀 部署到 Hostinger 服务器指南

## ✅ 可以部署！

Hostinger 支持 Node.js 应用，但需要手动配置。相比 Vercel，需要更多步骤，但你有完全控制权。

## 📋 前置要求

### 检查你的 Hostinger 服务器类型

1. **VPS（推荐）**
   - ✅ 完全控制
   - ✅ 可以安装 Node.js、Nginx、PostgreSQL
   - ✅ 适合生产环境

2. **共享主机**
   - ⚠️ 可能不支持 Node.js
   - ⚠️ 需要确认是否支持 Node.js 应用
   - ⚠️ 数据库可能是 MySQL（需要调整）

## 🛠️ 部署步骤

### 步骤1：准备服务器环境

#### 1.1 连接到服务器

```bash
ssh root@你的服务器IP
# 或使用 Hostinger 提供的 SSH 凭据
```

#### 1.2 安装 Node.js（如果还没有）

```bash
# 使用 NodeSource 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 1.3 安装 PostgreSQL（如果还没有）

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

在 PostgreSQL 命令行中：

```sql
CREATE DATABASE ezproduct;
CREATE USER ezproduct_user WITH PASSWORD '你的强密码';
GRANT ALL PRIVILEGES ON DATABASE ezproduct TO ezproduct_user;
\q
```

#### 1.4 安装 Nginx（用于反向代理和 SSL）

```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.5 安装 PM2（用于进程管理）

```bash
sudo npm install -g pm2
```

### 步骤2：上传代码到服务器

#### 方法1：使用 Git（推荐）

```bash
# 在服务器上
cd /var/www  # 或你喜欢的目录
git clone https://github.com/你的用户名/ezproduct.git
cd ezproduct
```

#### 方法2：使用 SCP

```bash
# 在本地终端
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct
scp -r . root@你的服务器IP:/var/www/ezproduct
```

### 步骤3：配置应用

#### 3.1 安装依赖

```bash
cd /var/www/ezproduct
npm install
```

#### 3.2 创建 `.env` 文件

```bash
nano .env
```

添加以下内容：

```env
# Shopify
SHOPIFY_API_KEY=你的Shopify_API_Key
SHOPIFY_API_SECRET=你的Shopify_API_Secret
SCOPES=write_products,read_products,write_product_listings,read_product_listings
SHOPIFY_APP_URL=https://你的域名.com

# Database (PostgreSQL)
DATABASE_URL=postgresql://ezproduct_user:你的密码@localhost:5432/ezproduct

# AI
GEMINI_API_KEY=你的Gemini_API_Key

# Environment
NODE_ENV=production
```

#### 3.3 运行数据库迁移

```bash
npm run db:migrate
```

#### 3.4 构建应用

```bash
npm run build
```

### 步骤4：配置 PM2

#### 4.1 创建 PM2 配置文件

```bash
nano ecosystem.config.js
```

添加以下内容：

```javascript
module.exports = {
  apps: [{
    name: 'ezproduct',
    script: 'node_modules/@remix-run/dev/cli.js',
    args: 'start',
    cwd: '/var/www/ezproduct',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/ezproduct-error.log',
    out_file: '/var/log/pm2/ezproduct-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

#### 4.2 启动应用

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 步骤5：配置 Nginx 反向代理

#### 5.1 创建 Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/ezproduct
```

添加以下内容（替换 `你的域名.com`）：

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5.2 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/ezproduct /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤6：配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d 你的域名.com

# 自动续期
sudo certbot renew --dry-run
```

### 步骤7：更新 Shopify 配置

1. **更新 Shopify Partners Dashboard**
   - App URL → `https://你的域名.com`
   - Redirect URLs → 
     ```
     https://你的域名.com/auth/callback
     https://你的域名.com/auth/shopify/callback
     https://你的域名.com/api/auth/callback
     ```

2. **更新 `shopify.app.toml`**
   ```toml
   application_url = "https://你的域名.com"
   ```

### 步骤8：测试应用

```bash
# 检查 PM2 状态
pm2 status

# 查看日志
pm2 logs ezproduct

# 测试应用
curl http://localhost:3000
```

## 🔧 常用命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs ezproduct

# 重启应用
pm2 restart ezproduct

# 停止应用
pm2 stop ezproduct

# 删除应用
pm2 delete ezproduct
```

### Nginx 管理

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx
```

### 更新代码

```bash
cd /var/www/ezproduct
git pull  # 如果使用 Git
# 或重新上传文件

npm install
npm run build
pm2 restart ezproduct
```

## ⚠️ 注意事项

### 防火墙配置

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 如果 Hostinger 使用 MySQL 而不是 PostgreSQL

需要修改 `prisma/schema.prisma`：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

然后更新 `.env`：

```env
DATABASE_URL=mysql://用户名:密码@localhost:3306/ezproduct
```

### 如果 Hostinger 是共享主机

可能需要：
1. 使用 Hostinger 提供的 Node.js 版本
2. 使用 Hostinger 提供的数据库（可能是 MySQL）
3. 通过 Hostinger 控制面板配置域名和 SSL

## 📝 对比：Hostinger vs Vercel

| 特性 | Hostinger | Vercel |
|------|-----------|--------|
| 成本 | 通常 $3-10/月 | 免费（起步） |
| 配置 | 需要手动配置 | 自动配置 |
| 控制权 | 完全控制 | 有限控制 |
| 维护 | 需要自己维护 | 自动维护 |
| 适合 | 有服务器经验 | 快速部署 |

## ✅ 完成！

现在你的应用已经在 Hostinger 上运行了！

## 🆘 遇到问题？

### 应用无法启动
- 检查 PM2 日志：`pm2 logs ezproduct`
- 检查端口是否被占用：`lsof -i :3000`
- 检查环境变量是否正确

### Nginx 502 错误
- 检查应用是否在运行：`pm2 status`
- 检查 Nginx 配置：`sudo nginx -t`
- 检查防火墙设置

### 数据库连接失败
- 检查 PostgreSQL 是否运行：`sudo systemctl status postgresql`
- 检查数据库连接字符串
- 检查防火墙是否允许 PostgreSQL 连接


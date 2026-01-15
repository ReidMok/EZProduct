# 🔗 Cursor 的 GitHub 集成说明

## ✅ Cursor 内置 Git 支持

Cursor **内置了 Git 功能**，不需要额外安装插件！

## 🎯 如何使用 Cursor 的 Git 功能

### 方法1：使用 Cursor 的 Git 界面（推荐）

1. **打开 Source Control 面板**
   - 点击左侧边栏的 **Source Control** 图标（分支图标）
   - 或按快捷键：`Ctrl + Shift + G`（Mac: `Cmd + Shift + G`）

2. **查看更改**
   - 所有更改的文件会显示在 Source Control 面板中
   - 可以点击文件查看具体的更改

3. **暂存更改**
   - 点击文件旁边的 **"+"** 按钮暂存文件
   - 或点击 **"Stage All Changes"** 暂存所有更改

4. **提交更改**
   - 在顶部的输入框中输入提交信息
   - 点击 **"Commit"** 按钮
   - 或按快捷键：`Ctrl + Enter`（Mac: `Cmd + Enter`）

5. **推送到 GitHub**
   - 点击右上角的 **"..."** 菜单
   - 选择 **"Push"** 或 **"Push to..."**
   - 如果是第一次推送，需要先设置远程仓库

### 方法2：使用命令面板

1. **打开命令面板**
   - 按快捷键：`Ctrl + Shift + P`（Mac: `Cmd + Shift + P`）

2. **搜索 Git 命令**
   - 输入 `Git:` 查看所有 Git 命令
   - 常用命令：
     - `Git: Add` - 暂存文件
     - `Git: Commit` - 提交更改
     - `Git: Push` - 推送到远程
     - `Git: Pull` - 从远程拉取
     - `Git: Clone` - 克隆仓库

### 方法3：使用终端（传统方式）

Cursor 内置了终端，可以直接使用 Git 命令：

```bash
git add .
git commit -m "你的提交信息"
git push
```

## 🔧 首次设置 GitHub 远程仓库

### 步骤1：在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写仓库名称（例如：`ezproduct`）
3. 选择 **Public** 或 **Private**
4. **不要**勾选 "Initialize this repository with a README"（因为本地已有代码）
5. 点击 "Create repository"

### 步骤2：在 Cursor 中连接远程仓库

**方法1：使用命令面板**

1. 按 `Ctrl + Shift + P`（Mac: `Cmd + Shift + P`）
2. 输入 `Git: Add Remote`
3. 输入远程名称：`origin`
4. 输入远程 URL：`https://github.com/你的用户名/ezproduct.git`

**方法2：使用终端**

```bash
git remote add origin https://github.com/你的用户名/ezproduct.git
```

### 步骤3：推送代码

**方法1：使用 Cursor 界面**

1. 在 Source Control 面板中提交所有更改
2. 点击右上角的 **"..."** → **"Push"**

**方法2：使用终端**

```bash
git push -u origin main
# 或
git push -u origin master
```

## 🔐 GitHub 认证

### 如果推送时要求认证：

1. **使用 Personal Access Token（推荐）**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 生成新 token，勾选 `repo` 权限
   - 推送时使用 token 作为密码

2. **使用 SSH（更安全）**
   - 生成 SSH 密钥：`ssh-keygen -t ed25519 -C "your_email@example.com"`
   - 添加到 GitHub：Settings → SSH and GPG keys → New SSH key
   - 使用 SSH URL：`git@github.com:你的用户名/ezproduct.git`

## 📝 Cursor 的 Git 功能特点

### ✅ 内置功能：

- ✅ **可视化 Git 操作** - 不需要命令行
- ✅ **文件差异对比** - 点击文件查看更改
- ✅ **分支管理** - 创建、切换、合并分支
- ✅ **提交历史** - 查看提交记录
- ✅ **冲突解决** - 可视化解决合并冲突

### ⚠️ 注意事项：

- Cursor 的 Git 功能基于 VS Code 的 Git 扩展
- 需要先安装 Git（macOS 通常已预装）
- 首次使用需要配置 Git 用户信息：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

## 🎯 推荐工作流程

1. **在 Cursor 中开发**
   - 编写代码
   - 查看更改（Source Control 面板）

2. **提交更改**
   - 暂存文件
   - 写提交信息
   - 提交

3. **推送到 GitHub**
   - 点击 Push
   - 或使用命令面板

4. **Vercel 自动部署**
   - Vercel 连接到 GitHub 后会自动部署

## 🆘 常见问题

### Q: Cursor 中看不到 Source Control 面板？
A: 点击左侧边栏的 Source Control 图标，或按 `Ctrl + Shift + G`

### Q: 推送时提示认证失败？
A: 使用 Personal Access Token 或配置 SSH 密钥

### Q: 如何查看 Git 状态？
A: 在终端运行 `git status`，或在 Source Control 面板查看

### Q: 如何撤销更改？
A: 在 Source Control 面板中，右键点击文件 → "Discard Changes"

## ✅ 总结

- ✅ Cursor **内置 Git 支持**，不需要插件
- ✅ 可以使用可视化界面或命令行
- ✅ 推荐使用 Source Control 面板进行 Git 操作
- ✅ 首次使用需要配置远程仓库和认证


#!/bin/bash

# 推送到 GitHub 的脚本
# 使用方法：bash push-to-github.sh

echo "🚀 开始推送 ezproduct 到 GitHub..."

# 进入项目目录
cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 ezproduct 目录中运行此脚本"
    exit 1
fi

# 1. 初始化 Git（如果还没有）
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
else
    echo "✅ Git 仓库已存在"
fi

# 2. 检查 Git 用户配置
if [ -z "$(git config user.name)" ]; then
    echo ""
    echo "⚠️  请先配置 Git 用户信息："
    echo "   git config --global user.name \"你的名字\""
    echo "   git config --global user.email \"你的邮箱\""
    echo ""
    read -p "是否现在配置？(y/n): " configure_user
    if [ "$configure_user" = "y" ]; then
        read -p "请输入你的名字: " user_name
        read -p "请输入你的邮箱: " user_email
        git config --global user.name "$user_name"
        git config --global user.email "$user_email"
        echo "✅ 用户信息已配置"
    else
        echo "❌ 请先配置用户信息"
        exit 1
    fi
fi

# 3. 添加所有文件
echo "📝 添加文件..."
git add .

# 4. 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ 没有需要提交的更改"
else
    # 5. 提交更改
    echo "💾 提交更改..."
    git commit -m "Initial commit - EZProduct Shopify App"
    echo "✅ 更改已提交"
fi

# 6. 检查远程仓库
if git remote | grep -q "^origin$"; then
    echo "✅ 远程仓库已配置"
    REMOTE_URL=$(git remote get-url origin)
    echo "   远程 URL: $REMOTE_URL"
else
    echo ""
    echo "📋 请先在 GitHub 创建仓库："
    echo "   1. 访问 https://github.com/new"
    echo "   2. 仓库名称：ezproduct"
    echo "   3. 不要勾选 'Initialize this repository with a README'"
    echo "   4. 点击 'Create repository'"
    echo ""
    read -p "请输入你的 GitHub 用户名: " github_username
    read -p "仓库是否公开？(y/n，默认y): " is_public
    
    if [ -z "$is_public" ] || [ "$is_public" = "y" ]; then
        REPO_URL="https://github.com/$github_username/ezproduct.git"
    else
        REPO_URL="https://github.com/$github_username/ezproduct.git"
    fi
    
    echo ""
    echo "添加远程仓库: $REPO_URL"
    git remote add origin "$REPO_URL"
    echo "✅ 远程仓库已添加"
fi

# 7. 设置主分支为 main
echo "🌿 设置主分支..."
git branch -M main 2>/dev/null || true

# 8. 推送
echo ""
echo "📤 推送到 GitHub..."
echo "   如果要求认证，请使用 Personal Access Token（不是密码）"
echo ""
echo "   如何获取 Token："
echo "   1. 访问 https://github.com/settings/tokens"
echo "   2. 点击 'Generate new token (classic)'"
echo "   3. 勾选 'repo' 权限"
echo "   4. 生成并复制 token"
echo "   5. 推送时在 Password 字段粘贴 token"
echo ""
read -p "按 Enter 开始推送..."

git push -u origin main

echo ""
echo "✅ 完成！"
echo "🎯 下一步：在 Vercel 中导入你的 GitHub 仓库"

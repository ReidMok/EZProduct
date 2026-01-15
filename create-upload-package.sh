#!/bin/bash

# 创建用于 Hostinger 上传的压缩包
# 使用方法：bash create-upload-package.sh

echo "📦 创建 Hostinger 上传包..."

cd /Users/Zhuanz/cursor/resinmemory_product/ezproduct

# 创建压缩包，排除不需要的文件
tar -czf ezproduct.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.shopify' \
  --exclude='prisma/dev.db' \
  --exclude='prisma/dev.db-journal' \
  --exclude='public/build' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='logs' \
  --exclude='.env' \
  --exclude='.env.local' \
  .

echo ""
echo "✅ 压缩包已创建：ezproduct.tar.gz"
echo "📁 位置：$(pwd)/ezproduct.tar.gz"
echo ""
echo "🎯 下一步："
echo "   1. 在 Hostinger 中选择 '上传文件'"
echo "   2. 上传 ezproduct.tar.gz"
echo "   3. 配置部署设置"


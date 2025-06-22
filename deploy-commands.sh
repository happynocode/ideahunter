#!/bin/bash

# Supabase Edge Function 部署命令
# 请在终端中逐条执行以下命令

echo "=== Step 1: 安装 Supabase CLI ==="
npm install -g supabase@latest

echo "=== Step 2: 登录 Supabase ==="
# 需要你的个人访问令牌，从 https://supabase.com/dashboard/account/tokens 获取
supabase login

echo "=== Step 3: 链接到你的项目 ==="
# 使用你的项目引用 ID
supabase link --project-ref niviihlfsqocuboafudh

echo "=== Step 4: 设置环境变量 ==="
# 设置 Edge Function 需要的环境变量
supabase secrets set \
  SUPABASE_URL="https://niviihlfsqocuboafudh.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="你的_service_role_key" \
  REDDIT_CLIENT_ID="你的_reddit_client_id" \
  REDDIT_CLIENT_SECRET="你的_reddit_client_secret" \
  REDDIT_USER_AGENT="RedditScraper/1.0 by /u/你的用户名" \
  DEEPSEEK_API_KEY="你的_deepseek_api_key"

echo "=== Step 5: 部署 Edge Functions ==="
# 部署 reddit-scraper 函数
supabase functions deploy reddit-scraper --no-verify-jwt

# 部署 deepseek-analyzer 函数
supabase functions deploy deepseek-analyzer --no-verify-jwt

echo "=== Step 6: 测试部署 ==="
# 测试函数是否正常工作
curl -X POST "https://niviihlfsqocuboafudh.supabase.co/functions/v1/reddit-scraper" \
  -H "Authorization: Bearer 你的_anon_key" \
  -H "Content-Type: application/json"

echo "=== 部署完成 ==="
echo "如果测试成功，你现在可以在应用中使用 Reddit 爬虫功能了！"
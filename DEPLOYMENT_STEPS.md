# Supabase Edge Function 部署步骤

## 前置要求

1. 确保你有 Supabase 项目的访问权限
2. 获取个人访问令牌：访问 https://supabase.com/dashboard/account/tokens

## 部署命令

### 1. 安装 Supabase CLI
```bash
npm install -g supabase@latest
```

### 2. 登录 Supabase
```bash
supabase login
```
会打开浏览器，登录你的 Supabase 账户

### 3. 链接项目
```bash
supabase link --project-ref niviihlfsqocuboafudh
```

### 4. 设置环境变量
```bash
supabase secrets set \
  SUPABASE_URL="https://niviihlfsqocuboafudh.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
注意：将 `SUPABASE_SERVICE_ROLE_KEY` 替换为你的实际 service role key

### 5. 部署函数
```bash
supabase functions deploy reddit-scraper --no-verify-jwt
```

### 6. 测试部署
```bash
curl -X POST "https://niviihlfsqocuboafudh.supabase.co/functions/v1/reddit-scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdmlpaGxmc3FvY3Vib2FmdWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDA0MDcsImV4cCI6MjA2NjExNjQwN30.p1kZQezwzr_7ZHs5Nd8sHZouoY76MmfnHSedeRi7gSc" \
  -H "Content-Type: application/json"
```

## 故障排除

### 如果遇到认证错误：
1. 确保使用了正确的个人访问令牌
2. 检查项目引用 ID 是否正确
3. 验证 service role key 是否有效

### 如果函数部署失败：
1. 检查函数代码是否有语法错误
2. 确保所有依赖都正确导入
3. 查看 Supabase 控制台的错误日志

### 如果测试返回 404：
这可能表示函数还没有完全部署，等待几分钟后再试

## 成功标志

当测试命令返回类似以下内容时，说明部署成功：
```json
{
  "success": true,
  "message": "Successfully scraped X startup ideas from Y subreddits",
  "totalScraped": 5,
  "results": [...]
}
```

## 下一步

部署成功后，你可以在应用的管理面板中点击"抓取 Reddit 数据"来触发真实的数据抓取。
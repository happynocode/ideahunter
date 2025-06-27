# 🚀 Google Auth 快速设置指南 - IdeaHunter

## 第一步：Google Cloud Console 设置

1. **访问 [Google Cloud Console](https://console.cloud.google.com/)**
   - 登录你的 Google 账号
   - 创建新项目或选择现有项目

2. **配置 OAuth 同意屏幕**
   - 点击 "APIs & Services" > "OAuth consent screen"
   - 选择 "External" 用户类型
   - 填写应用名称：`IdeaHunter`
   - 填写用户支持电子邮件和开发者联系信息

3. **创建 OAuth 2.0 凭据**
   - 点击 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "OAuth client ID"
   - 选择 "Web application"
   - 名称：`IdeaHunter Web Client`

4. **配置授权域名和重定向 URI**

   **Authorized JavaScript origins** (不能包含路径，不能以 "/" 结尾)：
   ```
   http://localhost:5173
   https://niviihlfsqocuboafudh.supabase.co
   https://你的生产域名.com
   ```

   **Authorized redirect URIs** (完整的回调 URL)：
   ```
   http://localhost:5173/auth/callback
   https://niviihlfsqocuboafudh.supabase.co/auth/v1/callback
   https://你的生产域名.com/ideahunter/auth/callback
   ```

   ⚠️ **重要提示**：生产环境的回调URL必须包含 `/ideahunter` 路径前缀！

5. **保存凭据**
   - 复制 `Client ID`
   - 复制 `Client Secret`

## 第二步：Supabase Dashboard 配置

1. **登录 [Supabase Dashboard](https://supabase.com/dashboard)**
   - 选择你的项目 (niviihlfsqocuboafudh)

2. **配置 Google Provider**
   - 点击 "Authentication" > "Providers"
   - 找到 "Google" 并启用
   - 填入 Client ID 和 Client Secret

3. **配置 URL 设置**
   - 点击 "Authentication" > "URL Configuration"
   - Site URL: `http://localhost:5173` (开发环境) 或 `https://你的生产域名.com/ideahunter` (生产环境)
   - 添加 Redirect URLs：
     ```
     http://localhost:5173
     https://你的生产域名.com/ideahunter
     ```

## 第三步：更新本地配置

1. **更新 `.env` 文件**
   ```env
   VITE_SUPABASE_URL=https://niviihlfsqocuboafudh.supabase.co
   VITE_SUPABASE_ANON_KEY=你的anon_key
   ```

2. **更新 `supabase/config.toml`**
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "你的-google-client-id.apps.googleusercontent.com"
   secret = "你的-google-client-secret"
   ```

## 第四步：测试

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **测试登录**
   - 访问 `http://localhost:5173`
   - 点击登录，应该能看到 "Continue with Google" 按钮
   - 点击后跳转到 Google 登录页面
   - 登录成功后会自动跳转回应用

3. **验证功能**
   - 检查用户是否成功登录
   - 确认用户信息正确显示
   - 测试登出功能

## 🔧 常见问题

### "redirect_uri_mismatch" 错误
- 检查 Google Cloud Console 中的 **Authorized redirect URIs** 是否正确
- 确保 Supabase 回调 URL 包含 `/auth/v1/callback` 路径

### "Invalid Origin" 错误
- 检查 **Authorized JavaScript origins** 字段
- 确保域名不包含路径，不以 "/" 结尾
- 例如：使用 `https://你的项目ID.supabase.co` 而不是 `https://你的项目ID.supabase.co/`

### "invalid_client" 错误
- 检查 Client ID 和 Client Secret 是否正确
- 确保在 Supabase Dashboard 中正确配置

### 本地开发无法登录
- 确保 `http://localhost:5173/auth/callback` 已添加到 Google Cloud Console
- 检查本地环境变量是否正确设置

## 📝 重要提示

- 生产环境必须使用 HTTPS
- 本地开发可以使用 HTTP
- 确保所有重定向 URL 都已正确配置
- Client Secret 要保密，不要提交到代码库


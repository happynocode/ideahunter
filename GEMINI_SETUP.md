# Google Gemini API 设置指南

## 如何获取 Gemini API Key

1. **访问 Google AI Studio**
   - 打开 [Google AI Studio](https://aistudio.google.com/)
   - 使用你的 Google 账号登录

2. **获取 API Key**
   - 在左侧菜单中找到 "Get API key"
   - 点击 "Create API key"
   - 选择一个现有的 Google Cloud 项目，或创建一个新项目
   - 复制生成的 API Key

## 在 Supabase 中设置环境变量

1. **登录 Supabase Dashboard**
   - 访问 [Supabase Dashboard](https://supabase.com/dashboard)
   - 选择你的项目

2. **添加环境变量**
   - 在左侧菜单中点击 "Settings"
   - 点击 "Environment variables"
   - 添加新的环境变量：
     - **Name:** `GEMINI_API_KEY`
     - **Value:** 粘贴你从 Google AI Studio 获取的 API Key

3. **重新部署 Edge Functions**
   - 环境变量更新后，需要重新部署相关的 Edge Functions
   - 在终端中运行：
   ```bash
   supabase functions deploy deepseek-analyzer
   ```

## 免费额度和限制

Google Gemini API 提供以下免费模型：

- **Gemini 2.5 Flash** - 最新的多模态模型
- **Gemini 2.5 Flash-Lite** - 轻量级版本
- **Gemini 2.0 Flash** - 高性能模型
- **Gemini 2.0 Flash-Lite** - 快速且经济的版本

### Rate Limits（速率限制）
- 每个模型都有不同的 rate limit
- 当一个模型达到限制时，系统会自动切换到下一个可用模型
- 如果所有模型都达到限制，系统会等待并重试

## 测试配置

在设置完成后，你可以通过以下方式测试：

1. **检查环境变量**
   - 在 Supabase Dashboard 的 Environment variables 中确认 `GEMINI_API_KEY` 已设置

2. **触发分析任务**
   - 运行 analyzer-coordinator 来测试 Gemini API 调用
   - 查看函数日志确认是否成功调用 Gemini API

## 故障排除

如果遇到问题：

1. **API Key 错误**
   - 确认 API Key 格式正确（以 `AIza` 开头）
   - 检查 API Key 是否有效（在 Google AI Studio 中验证）

2. **Rate Limit 错误**
   - 系统会自动轮换模型，无需手动干预
   - 如果所有模型都达到限制，等待一段时间后重试

3. **网络错误**
   - 检查 Supabase 函数的网络连接
   - 查看函数日志获取详细错误信息

## 迁移说明

此次更改将 DeepSeek API 替换为 Google Gemini API：

- ✅ 更新了 API 调用逻辑
- ✅ 实现了多模型轮换机制
- ✅ 保持了相同的输入/输出格式
- ✅ 优化了错误处理和重试逻辑

无需更改其他代码，现有的分析流程将继续正常工作。 
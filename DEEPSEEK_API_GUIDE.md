# DeepSeek API 使用指南

## 获取 API Key

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册账户并完成认证
3. 在 API 管理页面创建新的 API Key
4. 复制生成的 API Key（格式通常为：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

## API 调用格式

DeepSeek API 兼容 OpenAI 格式，基础 URL：`https://api.deepseek.com`

### 示例请求：

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user", 
        "content": "Hello!"
      }
    ],
    "stream": false
  }'
```

### 响应格式：

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "deepseek-chat",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

## 支持的模型

- `deepseek-chat` - 通用对话模型
- `deepseek-coder` - 编程专用模型

## 重要参数

- `max_tokens`: 最大生成 token 数 (1-4096)
- `temperature`: 创造性控制 (0.0-2.0)
- `stream`: 是否流式输出 (true/false)

## 在项目中设置

将你的 API Key 添加到 Supabase 环境变量：

```bash
supabase secrets set DEEPSEEK_API_KEY="sk-your-actual-api-key-here"
```

## 注意事项

1. API Key 需要妥善保管，不要泄露
2. DeepSeek 有调用频率限制，注意控制请求频率
3. 确保网络环境能够访问 api.deepseek.com
4. API 响应时间通常在 2-10 秒
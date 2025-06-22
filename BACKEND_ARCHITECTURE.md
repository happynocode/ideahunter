# ScraperDash 后端架构说明

## 整体架构概览

ScraperDash 采用 Supabase Edge Functions 的 serverless 架构，实现了高效的并发处理和模块化设计。

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scheduler     │───▶│ Reddit Scraper  │───▶│ DeepSeek Analyzer│
│  (调度器)        │    │   (数据抓取)     │    │   (AI分析)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │ raw_reddit_posts│    │  startup_ideas  │
         │              │    (原始数据)    │    │   (分析结果)     │
         └──────────────▶└─────────────────┘    └─────────────────┘
                         
┌─────────────────┐    ┌─────────────────┐
│  Get Ideas      │    │ Get Industries  │
│  (数据查询)      │    │  (行业数据)      │
└─────────────────┘    └─────────────────┘
```

## 核心 Edge Functions

### 1. Reddit Scraper (reddit-scraper/index.ts)

**功能**：并发抓取Reddit数据
**输入**：无（或可选的配置参数）
**输出**：抓取统计信息

#### 并发机制
```typescript
// 1. 获取所有需要抓取的subreddit
const subreddits = getAllSubreddits(); // 从13个行业映射中提取

// 2. 分批并发处理（控制并发数量避免速率限制）
const concurrencyLimit = 5;
for (let i = 0; i < subreddits.length; i += concurrencyLimit) {
  const batch = subreddits.slice(i, i + concurrencyLimit);
  
  // 3. 每批内部并发执行
  const batchPromises = batch.map(async (subreddit) => {
    const posts = await fetchRedditPosts(subreddit, accessToken, 25);
    return processPosts(posts, supabaseClient);
  });
  
  // 4. 等待当前批次完成
  await Promise.all(batchPromises);
  
  // 5. 批次间延迟（避免API限制）
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

#### 数据写入流程
```typescript
// 1. 预处理：过滤和分类
posts.forEach(post => {
  if (!isValidPost(post)) return; // PRD标准：upvotes>=5, comments>=2
  
  const industryId = classifyIndustry(post.title, post.content, post.subreddit);
  
  // 2. 重复检查
  const existing = await supabaseClient
    .from('raw_reddit_posts')
    .select('id')
    .eq('redditId', post.id)
    .single();
  
  if (!existing) {
    processedPosts.push({
      title: post.title,
      content: post.selftext || '',
      author: post.author,
      subreddit: post.subreddit,
      upvotes: post.score,
      comments: post.num_comments,
      permalink: `https://reddit.com${post.permalink}`,
      redditId: post.id,
      industryId: industryId,
    });
  }
});

// 3. 批量插入数据库
const { error } = await supabaseClient
  .from('raw_reddit_posts')
  .insert(processedPosts);
```

### 2. DeepSeek Analyzer (deepseek-analyzer/index.ts)

**功能**：AI分析Reddit数据生成创业想法
**输入**：可选的强制分析标志
**输出**：生成的创业想法数量和统计

#### 并发分析机制
```typescript
// 1. 并发处理多个行业
const industryPromises = Object.entries(INDUSTRIES).map(async ([industryId, industryName]) => {
  // 2. 获取该行业最近3天的数据
  const posts = await supabaseClient
    .from('raw_reddit_posts')
    .select('*')
    .eq('industryId', parseInt(industryId))
    .gte('createdAt', threeDaysAgo.toISOString())
    .order('upvotes', { ascending: false })
    .limit(50);

  // 3. 主题聚合（相同问题的帖子分组）
  const topicGroups = aggregatePostsByTopic(posts);
  
  // 4. 每个主题组调用DeepSeek API
  for (const topicPosts of topicGroups.slice(0, 3)) {
    const prompt = createAnalysisPrompt(industryName, topicPosts);
    const analysisResponse = await callDeepSeekAPI(prompt);
    
    // 5. 解析并保存结果
    const ideas = parseAnalysisResponse(analysisResponse);
    await saveStartupIdeas(ideas, industryId, topicPosts);
  }
});

// 6. 控制并发（限制同时分析的行业数）
const concurrencyLimit = 3;
for (let i = 0; i < industryPromises.length; i += concurrencyLimit) {
  const batch = industryPromises.slice(i, i + concurrencyLimit);
  await Promise.allSettled(batch);
  
  // API调用间隔
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

#### DeepSeek API调用和数据写入
```typescript
// 1. 构建分析提示词
const prompt = `
分析以下Reddit帖子并生成3-5个创业想法：
${JSON.stringify(posts, null, 2)}

返回JSON格式：
{
  "ideas": [
    {
      "title": "创业想法标题",
      "summary": "详细概述",
      "keywords": ["关键词1", "关键词2"],
      "existing_solutions": "现有解决方案分析",
      "solution_gaps": "解决方案缺口",
      "market_size": "市场规模估算",
      "confidence_score": 85,
      "source_post_ids": [1, 3, 5]
    }
  ]
}
`;

// 2. 调用DeepSeek API
const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: '你是创业分析专家...' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.7
  })
});

// 3. 处理响应并写入数据库
const analysisData = JSON.parse(cleanResponse);
for (const ideaData of analysisData.ideas) {
  // 聚合源帖子的数据
  const sourcePosts = topicPosts.filter(post => 
    ideaData.source_post_ids.includes(post.id)
  );
  
  const startupIdea = {
    title: ideaData.title,
    summary: ideaData.summary,
    industryId: parseInt(industryId),
    upvotes: sourcePosts.reduce((sum, post) => sum + post.upvotes, 0),
    comments: sourcePosts.reduce((sum, post) => sum + post.comments, 0),
    keywords: ideaData.keywords,
    subreddit: sourcePosts[0]?.subreddit,
    redditPostUrls: sourcePosts.map(post => post.permalink),
    existingSolutions: ideaData.existing_solutions,
    solutionGaps: ideaData.solution_gaps,
    marketSize: ideaData.market_size,
    confidenceScore: ideaData.confidence_score,
    sourcePostIds: sourcePosts.map(post => post.id)
  };

  // 插入数据库
  await supabaseClient
    .from('startup_ideas')
    .insert(startupIdea);
}
```

### 3. Scheduler (scheduler/index.ts)

**功能**：定时调度器，协调其他Functions执行
**输入**：任务类型（daily/scrape/analyze）
**输出**：执行结果统计

#### 函数间调用机制
```typescript
// 1. 内部函数调用封装
async function callEdgeFunction(functionName: string, payload: any = {}): Promise<TaskResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}

// 2. 顺序执行任务
if (taskType === 'daily' || taskType === 'scrape') {
  const scrapeResult = await callEdgeFunction('reddit-scraper');
  results.push(scrapeResult);
  
  // 等待一段时间避免API限制
  if (scrapeResult.success) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

if (taskType === 'daily' || taskType === 'analyze') {
  const analysisResult = await callEdgeFunction('deepseek-analyzer');
  results.push(analysisResult);
}

// 3. 更新执行统计
const successRate = (successfulTasks / totalTasks) * 100;
await updateDailyStats(successRate);
```

### 4. 查询 Functions

#### Get Ideas (get-ideas/index.ts)
- **功能**：查询创业想法，支持筛选和分页
- **并发**：无需并发，直接查询数据库
- **优化**：使用数据库索引和分页

#### Get Industries (get-industries/index.ts)
- **功能**：获取所有行业数据和想法统计
- **并发**：并发查询每个行业的想法数量

## 数据库设计

### 表结构
```sql
-- 原始Reddit数据
raw_reddit_posts (
  id, title, content, author, subreddit,
  upvotes, comments, permalink, reddit_id,
  industry_id, created_at, scraped_at
)

-- AI分析的创业想法
startup_ideas (
  id, title, summary, industry_id,
  upvotes, comments, keywords, subreddit,
  reddit_post_urls, existing_solutions,
  solution_gaps, market_size, confidence_score,
  source_post_ids, created_at, updated_at
)

-- 行业分类
industries (
  id, name, slug, icon, color, description
)

-- 每日统计
daily_stats (
  id, date, total_ideas, new_industries,
  avg_upvotes, success_rate
)
```

### 索引优化
```sql
-- 提升查询性能的索引
CREATE INDEX idx_startup_ideas_industry_id ON startup_ideas(industry_id);
CREATE INDEX idx_startup_ideas_created_at ON startup_ideas(created_at);
CREATE INDEX idx_startup_ideas_upvotes ON startup_ideas(upvotes);
CREATE INDEX idx_startup_ideas_confidence_score ON startup_ideas(confidence_score);
CREATE INDEX idx_raw_reddit_posts_reddit_id ON raw_reddit_posts(reddit_id);
```

## 并发处理策略

### 1. Reddit抓取并发
- **水平扩展**：同时处理多个subreddit
- **批次控制**：每批5个避免API限制
- **错误恢复**：单个失败不影响整体
- **重试机制**：失败自动重试最多3次

### 2. DeepSeek分析并发
- **行业级并发**：同时分析多个行业
- **主题分组**：相似问题聚合分析
- **API限制**：批次间延迟5秒
- **错误隔离**：单个行业失败不影响其他

### 3. 数据库写入优化
- **批量插入**：减少数据库连接
- **重复检查**：避免数据重复
- **事务处理**：保证数据一致性

## 错误处理和监控

### 1. 分层错误处理
```typescript
// Function级错误
try {
  const result = await processFunction();
  return successResponse(result);
} catch (error) {
  console.error('Function error:', error);
  return errorResponse(error.message);
}

// 批次级错误
const results = await Promise.allSettled(batchPromises);
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Batch ${index} failed:`, result.reason);
  }
});

// 任务级错误
const overallSuccess = results.every(r => r.success);
if (!overallSuccess) {
  return partialSuccessResponse(results);
}
```

### 2. 性能监控
- **执行时间**：记录每个阶段耗时
- **成功率**：统计任务成功率
- **API配额**：监控外部API使用情况
- **数据库性能**：查询优化和索引使用

## 部署和扩展

### 1. Edge Functions 部署
```bash
# 部署所有函数
supabase functions deploy reddit-scraper
supabase functions deploy deepseek-analyzer
supabase functions deploy get-ideas
supabase functions deploy get-industries
supabase functions deploy scheduler
```

### 2. 环境变量配置
```bash
# Reddit API
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_USER_AGENT=ScraperDash/1.0

# DeepSeek API
DEEPSEEK_API_KEY=your-api-key

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. 定时任务设置
```bash
# 使用 cron 或 GitHub Actions 每日触发
curl -X POST "https://your-project.supabase.co/functions/v1/scheduler" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task": "daily"}'
```

这个架构设计实现了高效的并发处理、模块化的函数设计和可靠的错误处理，能够满足PRD中提到的每日自动抓取和分析需求。 
# Reddit Scraper 架构优化方案 - TODO List

## 🎯 项目概述
解决 Reddit Scraper 经常 timeout 的问题，通过分批异步处理架构提升系统稳定性和可扩展性。

---

## 📋 Phase 1: 数据库架构设计 (优先级: 🔴 高)

### ✅ 数据库表设计
- [x] **创建 `scrape_tasks` 表**
  ```sql
  CREATE TABLE scrape_tasks (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industries(id),
    time_range VARCHAR(10) NOT NULL, -- '1h', '24h', '7d', '30d'
    status VARCHAR(20) NOT NULL DEFAULT 'pending_scrape', 
      -- 状态: pending_scrape, scraping, complete_scrape, pending_analysis, analyzing, complete_analysis, failed
      -- 新增锁状态: coordinator_lock, analyzer_lock
    batch_id VARCHAR(100) NOT NULL, -- 同一次trigger的批次ID
    posts_scraped INTEGER DEFAULT 0,
    posts_processed INTEGER DEFAULT 0,
    ideas_generated INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
  );
  ```

- [x] **添加数据库索引**
  ```sql
  CREATE INDEX idx_scrape_tasks_status_batch ON scrape_tasks (status, batch_id);
  CREATE INDEX idx_scrape_tasks_created_at ON scrape_tasks (created_at);
  CREATE INDEX idx_scrape_tasks_industry_status ON scrape_tasks (industry_id, status);
  -- 新增锁相关索引
  CREATE INDEX idx_scrape_tasks_lock ON scrape_tasks (status, industry_id, created_at) 
    WHERE status IN ('coordinator_lock', 'analyzer_lock');
  ```

- [x] **更新现有表结构** (如果需要)
  - [x] 确认 `raw_reddit_posts` 表有 `analyzed` 和 `analyzed_at` 字段
  - [x] 确认 `industries` 表数据完整性

### 🔴 **紧急修复完成 - 分布式锁和重试机制**
- [x] **修复分布式锁机制**
  - [x] 使用真正的数据库记录作为分布式锁
  - [x] industry_id = -1 表示 scraper_coordinator 锁
  - [x] industry_id = -2 表示 analyzer_coordinator 锁
  - [x] 使用 created_at 字段作为锁过期时间
  - [x] 在 finally 块中自动释放锁

- [x] **添加任务超时检测**
  - [x] 10分钟任务超时机制
  - [x] 自动重置超时任务为可重试状态
  - [x] 超过最大重试次数的任务标记为失败

- [x] **实现真正的重试机制**
  - [x] 失败任务1小时后自动重试
  - [x] 重试时递增 retry_count
  - [x] 达到 max_retries 后永久标记为失败
  - [x] 防止竞争条件的状态检查

- [x] **优化错误处理**
  - [x] 详细的错误日志记录
  - [x] 敏感信息脱敏处理
  - [x] 状态更新时的事务保护

---

## 📋 Phase 2: 核心函数开发 (优先级: 🔴 高)

### ✅ 新建 Task Creator Function
- [x] **创建 `supabase/functions/task-creator/index.ts`**
  - [x] 接收用户请求参数 (timeRange, industryIds?)
  - [x] 生成唯一 batch_id (UUID)
  - [x] 为每个行业创建 scrape_tasks 记录
  - [x] 返回 batch_id 和创建的任务数量
  - [x] 添加 CORS 头和错误处理

- [x] **Task Creator 功能要求**
  ```typescript
  interface TaskCreatorRequest {
    timeRange: string;        // '1h', '24h', '7d', '30d'
    industryIds?: number[];   // 可选，默认处理所有行业
    forceCreate?: boolean;    // 是否强制创建（即使有pending任务）
  }
  ```

### ✅ 新建 Scraper Coordinator Cron
- [x] **创建 `supabase/functions/scraper-coordinator/index.ts`**
  - [x] 查询 `status = 'pending_scrape'` 的任务
  - [x] 按 created_at 排序，每次处理 3-5 个行业
  - [x] 调用 reddit-scraper 并传递 industry_ids 和 task_ids
  - [x] 更新任务状态为 'scraping'
  - [x] 添加分布式锁防止重复执行

### ✅ 新建 Analyzer Coordinator Cron  
- [x] **创建 `supabase/functions/analyzer-coordinator/index.ts`**
  - [x] 查询 `status = 'complete_scrape'` 的任务
  - [x] 按 completed_at 排序，每次处理 3-5 个行业
  - [x] 调用 deepseek-analyzer 并传递 industry_ids 和 task_ids
  - [x] 更新任务状态为 'analyzing'
  - [x] 添加分布式锁防止重复执行

---

## 📋 Phase 3: 现有函数优化 (优先级: 🔴 高)

### ✅ Reddit Scraper 重构
- [x] **修改 `supabase/functions/reddit-scraper/index.ts`**
  - [x] **支持按行业筛选处理**
    ```typescript
    interface ScraperRequest {
      industry_ids: number[];     // 只处理指定行业
      time_range: string;
      task_ids: number[];         // 对应的task ID用于状态更新
      batch_id: string;           // 批次ID
    }
    ```
  
  - [x] **移除自动触发逻辑**
    - [x] 删除 `triggerDeepSeekAnalyzer()` 调用
    - [x] 删除 analyzerTriggered 相关代码
  
  - [x] **添加 Task 状态管理**
    - [x] 开始时更新状态为 'scraping'
    - [x] 完成时更新状态为 'complete_scrape'
    - [x] 失败时更新状态为 'failed' 并记录错误
    - [x] 更新 posts_scraped 和 posts_processed 统计
  
  - [x] **优化行业筛选逻辑**
    ```typescript
    // 只处理指定行业的 subreddits
    const targetIndustries = industry_ids.map(id => 
      Object.entries(INDUSTRY_MAPPING).find(([_, config]) => config.id === id)
    ).filter(Boolean);
    const subreddits = targetIndustries.flatMap(([_, config]) => config.subreddits);
    ```

### ✅ DeepSeek Analyzer 重构
- [x] **修改 `supabase/functions/deepseek-analyzer/index.ts`**
  - [x] **支持按行业筛选处理**
    ```typescript
    interface AnalyzerRequest {
      industry_ids: number[];     // 只分析指定行业  
      time_range: string;
      task_ids: number[];         // 对应的task ID用于状态更新
      batch_id: string;           // 批次ID
    }
    ```
  
  - [x] **替换全行业处理逻辑**
    ```typescript
    // 替换: Object.entries(INDUSTRIES).map(...)
    const targetIndustries = industry_ids.map(id => 
      Object.entries(INDUSTRIES).find(([industryId, _]) => parseInt(industryId) === id)
    ).filter(Boolean);
    ```
  
  - [x] **添加 Task 状态管理**
    - [x] 开始时更新状态为 'analyzing'
    - [x] 完成时更新状态为 'complete_analysis'
    - [x] 失败时更新状态为 'failed' 并记录错误
    - [x] 更新 ideas_generated 统计
  
  - [x] **改进错误处理**
    - [x] 单个行业失败不影响其他行业
    - [x] 记录详细的错误信息到 task 表
    - [x] 支持重试机制

---

## 📋 Phase 4: Cron Jobs 配置 (优先级: 🟡 中)

### ✅ Supabase Cron Jobs 设置
- [x] **配置 Scraper Coordinator**
  ```sql
  SELECT cron.schedule(
    'scraper-coordinator',
    '*/2 * * * *',  -- 每2分钟运行
    'SELECT net.http_post(
      url := ''https://niviihlfsqocuboafudh.supabase.co/functions/v1/scraper-coordinator'',
      headers := ''{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}''::jsonb
    );'
  );
  ```

- [x] **配置 Analyzer Coordinator**
  ```sql
  SELECT cron.schedule(
    'analyzer-coordinator', 
    '*/2 * * * *',  -- 每2分钟运行
    'SELECT net.http_post(
      url := ''https://niviihlfsqocuboafudh.supabase.co/functions/v1/analyzer-coordinator'',
      headers := ''{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}''::jsonb
    );'
  );
  ```

- [ ] **配置清理任务** (可选)
  ```sql
  -- 每天清理7天前的已完成任务
  SELECT cron.schedule(
    'cleanup-old-tasks',
    '0 2 * * *',  -- 每天凌晨2点
    'DELETE FROM scrape_tasks WHERE completed_at < NOW() - INTERVAL ''7 days'' AND status IN (''complete_analysis'', ''failed'');'
  );
  ```

---

## 📋 Phase 5: 前端集成 (优先级: 🟡 中)

### ✅ 前端功能更新
- [x] **修改 Scraper Control 组件**
  - [x] 调用 task-creator 而不是直接调用 reddit-scraper
  - [x] 显示 batch_id 和任务创建成功提示
  - [x] 添加任务状态查询功能
  - [x] 显示最近创建的任务批次列表

- [x] **新建任务监控界面**
  - [x] 创建 TaskMonitor 组件
  - [x] 实时显示当前运行的任务状态
  - [x] 按 batch_id 分组显示任务进度
  - [x] 显示每个行业的处理统计
  - [x] 错误任务的重试功能
  - [x] 自动刷新功能（30秒间隔）
  - [x] 进度条和状态图标显示

- [x] **添加 API 接口**
  - [x] 添加 GET /api/tasks/status/:batchId - 查询任务状态
  - [x] 添加 GET /api/tasks/history?page=1&limit=20 - 查询历史任务
  - [x] 添加 POST /api/tasks/retry/:taskId - 重试失败任务
  - [x] 完整的任务状态统计和错误处理

- [x] **数据库支持**
  - [x] 添加 scrape_tasks 表到 schema
  - [x] 添加相关 TypeScript 类型定义
  - [x] 实现存储层的任务管理方法

---

## 📋 Phase 6: 监控与优化 (优先级: 🟢 低)

### ✅ 系统监控
- [ ] **执行指标收集**
  - [ ] 任务执行时间统计
  - [ ] 成功率统计
  - [ ] 各行业处理效率分析
  - [ ] API 调用频率监控

- [ ] **告警机制**
  - [ ] 任务执行时间过长告警
  - [ ] 失败率过高告警  
  - [ ] DeepSeek API 额度告警
  - [ ] 数据库性能告警

### ✅ 性能优化
- [ ] **批处理优化**
  - [ ] 根据历史数据动态调整批大小
  - [ ] 按行业 subreddit 数量智能分组
  - [ ] 高峰时段处理策略

- [ ] **缓存机制**
  - [ ] Reddit API 响应缓存
  - [ ] 行业配置缓存
  - [ ] 任务状态缓存

---

## 🚀 实施时间表

### Week 1: 基础架构
- [ ] Phase 1: 数据库设计 (1天)
- [ ] Phase 2: Task Creator (2天)
- [ ] Phase 3: Reddit Scraper 重构 (2天)

### Week 2: 核心功能
- [ ] Phase 3: DeepSeek Analyzer 重构 (2天)
- [ ] Phase 2: Coordinator Functions (2天)
- [ ] Phase 4: Cron Jobs 配置 (1天)

### Week 3: 集成测试
- [ ] 端到端功能测试 (2天)
- [ ] 性能测试和优化 (2天)
- [ ] Phase 5: 前端集成 (1天)

### Week 4: 监控部署
- [ ] Phase 6: 监控系统 (2天)
- [ ] 文档和培训 (1天)
- [ ] 生产环境部署 (2天)

---

## 🎯 成功指标

### 技术指标
- [ ] 单次 scraping 任务执行时间 < 2分钟
- [ ] 系统整体成功率 > 95%
- [ ] 任务失败后自动重试成功率 > 80%
- [ ] 并发处理能力提升 5倍以上

### 业务指标  
- [ ] 用户触发到数据可见延迟 < 30分钟
- [ ] 支持处理 100+ 行业扩展
- [ ] 每日处理 posts 数量提升 3倍
- [ ] 生成 ideas 质量保持现有水平

---

## 📝 注意事项

### 🔒 安全考虑
- [ ] 所有 cron jobs 使用 SERVICE_ROLE_KEY
- [ ] 添加 API 调用频率限制
- [ ] 敏感错误信息脱敏处理

### 🔧 开发建议
- [ ] 每个 function 添加详细日志
- [ ] 使用 TypeScript 严格模式
- [ ] 添加单元测试和集成测试
- [ ] 配置代码格式化和 lint

### 📊 测试策略
- [ ] 本地开发环境完整测试
- [ ] Staging 环境压力测试
- [ ] 生产环境灰度发布
- [ ] 回滚方案准备

---

**总计:** 59 个待办事项
**预计工期:** 4 周
**风险等级:** 中等 (主要风险在于 API 调用频率限制和数据迁移)

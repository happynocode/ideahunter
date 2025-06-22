**Product Requirements Document (PRD)**

**Project Name:** Reddit-based Startup Idea Scraper

**Date:** June 21, 2025

---

## 1. Executive Summary

每日自动从 Reddit 抓取针对不同行业的用户需求与痛点帖，利用 DeepSeek 提炼并聚合信息，生成高质量、未被充分满足的创业点子列表，帮助科技创业者与小型商业主发现市场空白。

---

## 2. Objectives & Success Metrics

- **目标**：按行业分类，每日输出 10–50 条新颖、有潜力的创业点子。
- **关键指标**：
  - 每日抓取帖数 & 输出点子条数
  - 用户访问量 & 行业报告点击率
  - CSV/JSON 导出次数
  - 管理后台抓取成功率 & 执行时长

---

## 3. Target Users & Use Cases

- **用户群体**：

  - 科技创业者（技术或产品驱动）
  - Small-business 经营者（寻求利基服务）
  - Side Hustlers & 业余创业者
  - 投资人（洞察早期机会）

- **核心场景**：

  1. 按行业浏览当天点子列表，看原帖链接与摘要
  2. 按关键词/Upvotes/评论数筛选感兴趣点子
  3. 导出 CSV/JSON 以便深入分析或团队分享

---

## 4. Content Sources & Classification

### 4.1 内容来源

- **首期**：Reddit（后续可拓展至 Hacker News、Product Hunt 等）

### 4.2 行业分类（20个细分行业）

**技术类（Tech）细分：**
1. SaaS & 云服务
2. 开发者工具 & 平台  
3. API & 后端服务
4. 移动应用开发
5. Web & 前端开发
6. 低/无代码平台
7. 网络安全 & 隐私

**其他行业：**
8. 人工智能 & 机器学习
9. 电商 & 零售
10. 健康 & 健身科技
11. 教育科技
12. 金融科技
13. 消费者服务
14. 企业服务 & B2B
15. 媒体 & 内容创作
16. 旅游 & 出行
17. 社交 & 社区
18. 绿色 & 可持续科技
19. 物流 & 供应链
20. 游戏 & 娱乐

---

## 5. Hot & Trending Subreddits

在抓取前关注以下高订阅/快速增长版块，以捕捉新兴需求：

```
r/announcements, r/AskReddit, r/funny, r/gaming, r/AIforEveryone, r/socialmedia,

r/technology, r/science, r/news, r/memes, r/movies, r/music, r/books,

r/food, r/cooking, r/DIY, r/homeimprovement, r/PersonalFinance, r/financialindependence,

r/crypto, r/aww, r/dataisbeautiful, r/InternetIsBeautiful, r/entrepreneur, r/startups, r/business
```

---

## 6. Subreddit 划分与抓取内容（20个细分行业）

| 行业                 | Subreddits                                                                                                                                                                                    | 帖子类型           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **1. SaaS & 云服务**   | r/SaaS, r/SaaSgrowth, r/cloud, r/aws, r/azure, r/googlecloud, r/kubernetes, r/docker, r/CloudComputing, r/SaaSSales, r/techsales, r/saastools, r/cloudnative, r/serverless                    | 服务需求、定价模型、部署方案 |
| **2. 开发者工具 & 平台**  | r/Programming, r/devops, r/git, r/github, r/vscode, r/IntelliJIDEA, r/vim, r/tooling, r/opensource, r/ExperiencedDevs, r/SoftwareArchitecture, r/codereview, r/devtools, r/productivity, r/technology       | 工具需求、集成痛点、效率优化 |
| **3. API & 后端服务**  | r/api, r/backend, r/node, r/golang, r/rust, r/python, r/java, r/microservices, r/Database, r/PostgreSQL, r/mongodb, r/redis, r/APIDesign, r/graphql, r/RESTful                               | 特性需求、性能优化、架构设计 |
| **4. 移动应用开发**      | r/androiddev, r/iOSProgramming, r/flutter, r/reactnative, r/swift, r/kotlin, r/xamarin, r/ionic, r/AppBusiness, r/UXDesign, r/MobileGaming, r/mobiledev, r/crossplatform                      | 功能需求、UX反馈、跨平台 |
| **5. Web & 前端开发**  | r/webdev, r/javascript, r/reactjs, r/vuejs, r/angular, r/svelte, r/nextjs, r/css, r/html, r/typescript, r/Frontend, r/WebPerf, r/jamstack, r/pwa, r/InternetIsBeautiful                                              | 框架选择、性能问题、新技术 |
| **6. 低/无代码平台**     | r/NoCode, r/LowCode, r/automate, r/zapier, r/Bubble, r/Webflow, r/Airtable, r/notion, r/integrations, r/workflow, r/automation, r/IFTTT, r/make                                               | 自动化需求、易用性、集成 |
| **7. 网络安全 & 隐私**   | r/cybersecurity, r/netsec, r/AskNetsec, r/privacy, r/security, r/hacking, r/malware, r/cryptography, r/InfoSec, r/penetrationtesting, r/blueteam, r/redteam, r/OSINT                          | 安全漏洞、防护方案、工具 |
| **8. AI & 机器学习**   | r/MachineLearning, r/artificial, r/ArtificialIntelligence, r/deeplearning, r/datascience, r/LocalLLaMA, r/LangChain, r/OpenAI, r/MLOps, r/tensorflow, r/pytorch, r/NLP, r/computervision, r/AIforEveryone, r/science, r/dataisbeautiful      | 算法需求、案例讨论、工具 |
| **9. 电商 & 零售**     | r/ecommerce, r/Shopify, r/ShopifyDev, r/woocommerce, r/magento, r/dropship, r/FulfillmentByAmazon, r/EtsySellers, r/PPC, r/AmazonSeller, r/ecommercetips, r/onlinestore, r/retail             | 市场需求、运营痛点、增长 |
| **10. 健康 & 健身科技**  | r/health, r/healthIT, r/fitness, r/running, r/bodyweightfitness, r/nutrition, r/WearOS, r/QuantifiedSelf, r/Telehealth, r/MedTech, r/DigitalHealth, r/mhealth, r/fitbit, r/AppleWatch        | 服务需求、工具建议、监测 |
| **11. 教育科技**       | r/education, r/edtech, r/learnprogramming, r/teachingresources, r/Teachers, r/LanguageLearning, r/OnlineTutoring, r/coursera, r/udemy, r/skillshare, r/LMS, r/elearning, r/studytips, r/books          | 教学痛点、平台需求、工具 |
| **12. 金融科技**       | r/fintech, r/PersonalFinance, r/investing, r/CryptoCurrency, r/financialindependence, r/OpenBanking, r/CreditCards, r/FIRE, r/StockMarket, r/RobinHood, r/DeFi, r/blockchain, r/bitcoin, r/crypto      | 产品功能、用户需求、创新 |
| **13. 消费者服务**      | r/SideHustle, r/smallbusiness, r/freelance, r/gig, r/food, r/cooking, r/DIY, r/homeimprovement, r/FieldService, r/Contractor, r/cleaning, r/delivery, r/services, r/handyman                 | 服务创意、盈利模式、本地 |
| **14. 企业服务 & B2B** | r/b2b, r/businessdev, r/sales, r/marketing, r/CRM, r/ERP, r/HumanResources, r/accounting, r/projectmanagement, r/productivity, r/workflow, r/collaboration, r/communication, r/remotework, r/entrepreneur, r/startups, r/business     | 流程优化、效率工具、协作 |
| **15. 媒体 & 内容创作**  | r/contentcreation, r/blogging, r/podcasting, r/youtubers, r/graphic_design, r/VideoEditing, r/photography, r/streaming, r/writing, r/copywriting, r/socialmediamarketing, r/CreatorEconomy, r/news, r/memes, r/movies, r/music, r/aww     | 平台需求、创作痛点、变现 |
| **16. 旅游 & 出行**    | r/travel, r/digitalnomad, r/backpacking, r/solotravel, r/travelhacks, r/onebag, r/awardtravel, r/flights, r/hotels, r/airbnb, r/uber, r/lyft, r/transportation, r/wanderlust                 | 行程规划、服务需求、预订 |
| **17. 社交 & 社区**    | r/socialmedia, r/communitymanagement, r/onlinecommunities, r/socialplatforms, r/ModSupport, r/CommunityManager, r/discord, r/slack, r/reddit, r/networking, r/dating, r/relationships        | 社交功能、社区建设、连接 |
| **18. 绿色 & 可持续科技** | r/sustainability, r/zerowaste, r/environment, r/solar, r/renewable, r/climatechange, r/greentech, r/cleanenergy, r/recycling, r/composting, r/upcycling, r/carbonfootprint, r/ESG             | 环保需求、产品创新、监测 |
| **19. 物流 & 供应链**   | r/logistics, r/supplychain, r/freight, r/warehouse, r/FreightBrokers, r/SupplyChainLogistics, r/3PL, r/shipping, r/inventory, r/procurement, r/manufacturing, r/operations, r/lean            | 效率工具、可视化需求、优化 |
| **20. 游戏 & 娱乐**    | r/gaming, r/gamedev, r/IndieGaming, r/Unity3D, r/unrealengine, r/godot, r/MobileGaming, r/VirtualReality, r/AR, r/streaming, r/twitch, r/youtube, r/entertainment | 游戏机制、内容创作、体验 |

## 7. 抓取 & 筛选规则

- **频率**：每天 UTC 00:00 执行一次。
- **预筛选**：Upvotes ≥ 5 且 评论数 ≥ 2。
- **关键词过滤**：排除常见成熟话题。
- **去重**：基于标题/正文相似度聚类，合并同一需求多帖。
- **处理**：调用 DeepSeek 提炼摘要、关键词，并识别现有解决方案与缺陷。

---

## 8. 产品功能 & 输出

- **输出**：每行业 10–50 条点子。

- **字段**：

  1. 标题
  2. 摘要
  3. 原帖链接列表
  4. 行业标签
  5. Upvotes
  6. 评论数
  7. 发布时间
  8. 关键词列表
  9. 现有解决方案
  10. 解决方案不足

- **Web 界面**：行业分页、列表视图、详情展开、关键词/行业筛选。

- **导出**：CSV/JSON。

---

## 9. 技术架构

### 9.1 前端

React + Vite + Tailwind CSS，SPA 架构，组件化设计，React Context 管理状态，SWR/React Query 缓存。

### 9.2 抓取与处理

Supabase Edge Functions 调度执行：RedditFetcher → PreFilter → DeepSeekProcessor → Aggregator → PersistService，失败入队重试。

### 9.3 数据接口

前端直连 Edge Functions：

```
GET /edge/functions/getIndustries
GET /edge/functions/getIdeas?industry=&keywords=&page=&pageSize=
GET /edge/functions/getIdeaDetail?id=
```

- 处理参数校验、Redis 缓存、Supabase Auth 验证。

### 9.4 数据存储

PostgreSQL 存储主数据；Redis 用于短期缓存与任务队列。

### 9.5 运维

Docker Compose 本地开发；GitHub Actions CI/CD；Supabase Logs + Logflare/Datadog 监控；RLS & 定期备份。

---

## 10. Milestones & Release Plan

| 版本           | 范围                       | 时间         |
| ------------ | ------------------------ | ---------- |
| MVP (M)      | 抓取 & 存储、预筛选、行业列表页、原帖链接展示 | 2025-07-15 |
| Next (S)     | DeepSeek 集成、关键词摘要、管理端监控  | 2025-08-01 |
| Optional (C) | 通知订阅、新数据源、用户自定义告警        | 2025-09-01 |

---

## 11. 风险 & 假设

- **假设**：Reddit 提供足够活跃话题。
- **风险**：API 限制、噪声数据、抓取失败。
- **应对**：调整频率、优化过滤、强化重试与监控。

---

*End of PRD*


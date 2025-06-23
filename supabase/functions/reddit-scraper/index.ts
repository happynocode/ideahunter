import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 3. 缓存Access Token - 函数级别缓存
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
  created_utc: number;
  author: string;
  url: string;
  id: string;
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
    after: string | null;
  };
}

interface ScraperRequest {
  industry_ids: number[];     // 只处理指定行业
  target_date: string;        // YYYY-MM-DD format
  task_ids: number[];         // 对应的task ID用于状态更新
  batch_id: string;           // 批次ID
}

interface ScraperResponse {
  success: boolean;
  message: string;
  totalProcessed: number;
  industriesProcessed: number;
  taskResults: Array<{
    taskId: number;
    industryId: number;
    processed: number;
    success: boolean;
    error?: string;
  }>;
}

// Industry mapping based on updated PRD (20 industries)
const INDUSTRY_MAPPING = {
  'SaaS & 云服务': {
    id: 1,
    subreddits: ['SaaS', 'SaaSgrowth', 'cloud', 'aws', 'azure', 'googlecloud', 'kubernetes', 'docker', 'CloudComputing', 'SaaSSales', 'techsales', 'saastools', 'cloudnative', 'serverless'],
    keywords: ['saas', 'software as a service', 'cloud', 'platform', 'subscription', 'api', 'service', 'kubernetes', 'docker', 'serverless', 'microservices']
  },
  'AI & 机器学习': {
    id: 2,
    subreddits: ['MachineLearning', 'artificial', 'ArtificialIntelligence', 'deeplearning', 'datascience', 'LocalLLaMA', 'LangChain', 'OpenAI', 'MLOps', 'tensorflow', 'pytorch', 'NLP', 'computervision', 'AIforEveryone', 'science', 'dataisbeautiful'],
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'llm', 'nlp', 'computer vision', 'data science', 'mlops']
  },
  '金融科技': {
    id: 3,
    subreddits: ['fintech', 'PersonalFinance', 'investing', 'CryptoCurrency', 'financialindependence', 'OpenBanking', 'CreditCards', 'FIRE', 'StockMarket', 'RobinHood', 'DeFi', 'blockchain', 'bitcoin', 'crypto'],
    keywords: ['fintech', 'finance', 'payment', 'banking', 'cryptocurrency', 'crypto', 'investment', 'trading', 'money', 'blockchain', 'defi']
  },
  '电商 & 零售': {
    id: 4,
    subreddits: ['ecommerce', 'Shopify', 'ShopifyDev', 'woocommerce', 'magento', 'dropship', 'FulfillmentByAmazon', 'EtsySellers', 'PPC', 'AmazonSeller', 'ecommercetips', 'onlinestore', 'retail'],
    keywords: ['ecommerce', 'e-commerce', 'retail', 'shop', 'marketplace', 'online store', 'dropshipping', 'amazon', 'shopify', 'payment']
  },
  '健康 & 健身科技': {
    id: 5,
    subreddits: ['health', 'healthIT', 'fitness', 'running', 'bodyweightfitness', 'nutrition', 'WearOS', 'QuantifiedSelf', 'Telehealth', 'MedTech', 'DigitalHealth', 'mhealth', 'fitbit', 'AppleWatch'],
    keywords: ['health', 'healthcare', 'medical', 'fitness', 'wellness', 'telemedicine', 'nutrition', 'mental health', 'wearable', 'health tech']
  },
  '教育科技': {
    id: 6,
    subreddits: ['education', 'edtech', 'learnprogramming', 'teachingresources', 'Teachers', 'LanguageLearning', 'OnlineTutoring', 'coursera', 'udemy', 'skillshare', 'LMS', 'elearning', 'studytips', 'books'],
    keywords: ['education', 'edtech', 'learning', 'teaching', 'course', 'training', 'skill', 'knowledge', 'school', 'university', 'lms', 'e-learning']
  },
  '开发者工具 & 平台': {
    id: 7,
    subreddits: ['Programming', 'devops', 'git', 'github', 'vscode', 'IntelliJIDEA', 'vim', 'tooling', 'opensource', 'ExperiencedDevs', 'SoftwareArchitecture', 'codereview', 'devtools', 'technology'],
    keywords: ['development', 'programming', 'code', 'developer', 'tool', 'framework', 'library', 'ide', 'editor', 'version control', 'devops', 'ci/cd']
  },
  '低/无代码平台': {
    id: 8,
    subreddits: ['NoCode', 'LowCode', 'automate', 'zapier', 'Bubble', 'Webflow', 'Airtable', 'notion', 'integrations', 'workflow', 'automation', 'IFTTT', 'make'],
    keywords: ['nocode', 'no code', 'low code', 'automation', 'workflow', 'integration', 'zapier', 'bubble', 'webflow', 'airtable', 'citizen developer']
  },
  '社交 & 社区': {
    id: 9,
    subreddits: ['socialmedia', 'communitymanagement', 'onlinecommunities', 'socialplatforms', 'ModSupport', 'CommunityManager', 'discord', 'slack', 'reddit', 'networking', 'dating', 'relationships'],
    keywords: ['social', 'community', 'networking', 'communication', 'collaboration', 'forum', 'chat', 'messaging', 'relationship', 'connection']
  },
  '游戏 & 娱乐': {
    id: 10,
    subreddits: ['gaming', 'gamedev', 'IndieGaming', 'Unity3D', 'unrealengine', 'godot', 'MobileGaming', 'VirtualReality', 'AR', 'streaming', 'twitch', 'youtube', 'entertainment'],
    keywords: ['gaming', 'game', 'entertainment', 'streaming', 'content', 'video game', 'mobile game', 'vr', 'ar', 'unity', 'unreal']
  },
  '绿色 & 可持续科技': {
    id: 11,
    subreddits: ['sustainability', 'zerowaste', 'environment', 'solar', 'renewable', 'climatechange', 'greentech', 'cleanenergy', 'recycling', 'composting', 'upcycling', 'carbonfootprint', 'ESG'],
    keywords: ['sustainability', 'green', 'eco', 'environment', 'renewable', 'climate', 'carbon', 'energy', 'waste', 'recycling', 'clean tech']
  },
  'API & 后端服务': {
    id: 12,
    subreddits: ['api', 'backend', 'node', 'golang', 'rust', 'python', 'java', 'microservices', 'Database', 'PostgreSQL', 'mongodb', 'redis', 'APIDesign', 'graphql', 'RESTful'],
    keywords: ['api', 'backend', 'server', 'database', 'microservices', 'rest', 'graphql', 'sql', 'nosql', 'performance', 'scaling', 'architecture']
  },
  '网络安全 & 隐私': {
    id: 13,
    subreddits: ['cybersecurity', 'netsec', 'AskNetsec', 'privacy', 'security', 'hacking', 'malware', 'cryptography', 'InfoSec', 'penetrationtesting', 'blueteam', 'redteam', 'OSINT'],
    keywords: ['security', 'cybersecurity', 'privacy', 'encryption', 'protection', 'vulnerability', 'penetration testing', 'malware', 'firewall', 'authentication']
  },
  '移动应用开发': {
    id: 222,
    subreddits: ['androiddev', 'iOSProgramming', 'flutter', 'reactnative', 'swift', 'kotlin', 'xamarin', 'ionic', 'AppBusiness', 'UXDesign', 'MobileGaming', 'mobiledev', 'crossplatform'],
    keywords: ['mobile', 'app', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin', 'cross platform', 'mobile ui', 'app store']
  },
  'Web & 前端开发': {
    id: 223,
    subreddits: ['webdev', 'javascript', 'reactjs', 'vuejs', 'angular', 'svelte', 'nextjs', 'css', 'html', 'typescript', 'Frontend', 'WebPerf', 'jamstack', 'pwa', 'InternetIsBeautiful'],
    keywords: ['web', 'frontend', 'javascript', 'react', 'vue', 'angular', 'css', 'html', 'typescript', 'responsive', 'performance', 'ui/ux']
  },
  '消费者服务': {
    id: 224,
    subreddits: ['SideHustle', 'smallbusiness', 'freelance', 'gig', 'food', 'cooking', 'DIY', 'homeimprovement', 'FieldService', 'Contractor', 'cleaning', 'delivery', 'services', 'handyman'],
    keywords: ['service', 'consumer', 'local', 'home', 'food', 'delivery', 'cleaning', 'repair', 'maintenance', 'gig economy', 'freelance']
  },
  '企业服务 & B2B': {
    id: 225,
    subreddits: ['b2b', 'businessdev', 'sales', 'marketing', 'CRM', 'ERP', 'HumanResources', 'accounting', 'projectmanagement', 'workflow', 'collaboration', 'communication', 'remotework', 'entrepreneur', 'startups', 'business'],
    keywords: ['b2b', 'enterprise', 'business', 'crm', 'erp', 'workflow', 'collaboration', 'hr', 'sales', 'marketing', 'project management']
  },
  '媒体 & 内容创作': {
    id: 226,
    subreddits: ['contentcreation', 'blogging', 'podcasting', 'youtubers', 'graphic_design', 'VideoEditing', 'photography', 'streaming', 'writing', 'copywriting', 'socialmediamarketing', 'CreatorEconomy', 'news', 'memes', 'movies', 'music', 'aww'],
    keywords: ['content', 'media', 'video', 'audio', 'podcast', 'blog', 'design', 'editing', 'streaming', 'creator', 'influencer', 'social media']
  },
  '旅游 & 出行': {
    id: 227,
    subreddits: ['travel', 'digitalnomad', 'backpacking', 'solotravel', 'travelhacks', 'onebag', 'awardtravel', 'flights', 'hotels', 'airbnb', 'uber', 'lyft', 'transportation', 'wanderlust'],
    keywords: ['travel', 'trip', 'vacation', 'hotel', 'flight', 'transportation', 'booking', 'tourism', 'nomad', 'journey']
  },
  '物流 & 供应链': {
    id: 228,
    subreddits: ['logistics', 'supplychain', 'freight', 'warehouse', 'FreightBrokers', 'SupplyChainLogistics', '3PL', 'shipping', 'inventory', 'procurement', 'manufacturing', 'operations', 'lean'],
    keywords: ['logistics', 'supply chain', 'shipping', 'warehouse', 'inventory', 'freight', 'delivery', 'procurement', 'operations', 'manufacturing']
  }
};

// 6. 移除无效subreddit - 已知问题subreddit黑名单
const PROBLEMATIC_SUBREDDITS = new Set([
  'memes', 'aww', 'movies', 'music', 'news', // 非创业相关
  'InternetIsBeautiful', // 经常timeout
  'wanderlust', // 低质量内容
]);

// Get subreddits for specific industries
function getSubredditsForIndustries(industryIds: number[]): string[] {
  const subreddits = new Set<string>();
  
  industryIds.forEach(industryId => {
    const industry = Object.values(INDUSTRY_MAPPING).find(ind => ind.id === industryId);
    if (industry) {
      industry.subreddits.forEach(sub => {
        // 6. 过滤问题subreddit
        if (!PROBLEMATIC_SUBREDDITS.has(sub)) {
          subreddits.add(sub);
        }
      });
    }
  });
  
  return Array.from(subreddits);
}

// 3. Reddit API authentication with caching
async function getRedditAccessToken(): Promise<string> {
  const now = Date.now();
  
  // 检查缓存的token是否仍有效
  if (cachedAccessToken && now < tokenExpiresAt) {
    console.log('🔄 Using cached Reddit access token');
    return cachedAccessToken;
  }

  console.log('🔑 Fetching new Reddit access token');
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'ScraperDash/1.0';

  if (!clientId || !clientSecret) {
    throw new Error('Reddit API credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reddit auth failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // 缓存token，设置55分钟过期（Reddit token通常1小时过期）
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (55 * 60 * 1000);
  
  return cachedAccessToken!;
}

// 1. Fetch posts from a subreddit with top and hot sorting (去掉new)
async function fetchRedditPosts(subreddit: string, accessToken: string, targetDate: string): Promise<RedditPost[]> {
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'ScraperDash/1.0';
  const maxRetries = 3;
  
  // Convert target date to Unix timestamps for filtering
  const targetDateObj = new Date(targetDate);
  const startOfDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 23, 59, 59);
  const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
  const endTimestamp = Math.floor(endOfDay.getTime() / 1000);
  
  console.log(`📅 Filtering posts for date: ${targetDate} (${startTimestamp} - ${endTimestamp})`);
  
  // Use 'all' time parameter to get broader results, then filter by date
  const timeParam = 'all';

  const allPosts: RedditPost[] = [];
  
  // 1. 只抓取top和hot，去掉new
  const sortMethods = ['top', 'hot'];
  
  for (const sortMethod of sortMethods) {
    let after: string | null = null;
    let totalFetched = 0;
    let lowQualityPages = 0; // 5. 智能分页限制
    const maxPages = sortMethod === 'top' ? 6 : 3; // top抓取更多页面
    const maxLowQualityPages = 2; // 连续低质量页面限制

    console.log(`📊 Fetching ${sortMethod} posts from r/${subreddit}...`);

    for (let page = 0; page < maxPages; page++) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const params = new URLSearchParams({
            limit: '100',
            raw_json: '1'
          });
          
          if (sortMethod === 'top') {
            params.set('t', timeParam);
          }
          
          if (after) {
            params.set('after', after);
          }

          const url = `https://oauth.reddit.com/r/${subreddit}/${sortMethod}?${params}`;
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': userAgent,
            },
          });

          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
            console.log(`Rate limited for r/${subreddit}, waiting ${retryAfter}s...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            retries++;
            continue;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: RedditResponse = await response.json();
          
          if (!data.data || !Array.isArray(data.data.children)) {
            break;
          }

          const posts = data.data.children.map(child => child.data);
          
          // Filter posts by target date
          const datePosts = posts.filter(post => {
            const postTimestamp = post.created_utc;
            return postTimestamp >= startTimestamp && postTimestamp <= endTimestamp;
          });
          
          console.log(`📅 Filtered ${posts.length} -> ${datePosts.length} posts by date for r/${subreddit}`);
          
          // 5. 智能分页限制 - 检查这一页的质量
          const validPosts = datePosts.filter(post => isValidPost(post));
          const qualityRatio = validPosts.length / Math.max(datePosts.length, 1);
          
          if (qualityRatio < 0.1) { // 低于10%的有效帖子
            lowQualityPages++;
            console.log(`⚠️ Low quality page ${page + 1} for r/${subreddit} ${sortMethod}: ${validPosts.length}/${posts.length} valid posts`);
            
            if (lowQualityPages >= maxLowQualityPages) {
              console.log(`🛑 Stopping ${sortMethod} fetch for r/${subreddit} due to consecutive low quality pages`);
              break;
            }
          } else {
            lowQualityPages = 0; // 重置计数器
          }
          
          allPosts.push(...datePosts);
          totalFetched += datePosts.length;
          
          after = data.data.after;
          
          if (!after || datePosts.length === 0) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 800)); // 稍微减少延迟
          break;
          
        } catch (error) {
          console.error(`Error fetching r/${subreddit} ${sortMethod} page ${page}, retry ${retries + 1}:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            console.error(`Max retries reached for r/${subreddit} ${sortMethod}, skipping`);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000 * retries)); // 减少重试延迟
        }
      }
      
      if (retries >= maxRetries || lowQualityPages >= maxLowQualityPages) break;
    }
    
    console.log(`📊 Fetched ${totalFetched} ${sortMethod} posts from r/${subreddit}`);
  }

  // 2. 预处理去重 - 在返回前去重
  const seenIds = new Set<string>();
  const uniquePosts = allPosts.filter(post => {
    if (seenIds.has(post.id)) {
      return false;
    }
    seenIds.add(post.id);
    return true;
  });
  
  console.log(`🔄 Deduplicated ${allPosts.length} -> ${uniquePosts.length} posts for r/${subreddit}`);
  return uniquePosts;
}

// 4. Enhanced post validation with more precise filtering
function isValidPost(post: RedditPost): boolean {
  if (!post.title || post.title === '[deleted]' || post.title === '[removed]') return false;
  if (!post.author || post.author === '[deleted]') return false;
  if (post.score < 5 || post.num_comments < 2) return false;
  
  const title = post.title.toLowerCase();
  const content = (post.selftext || '').toLowerCase();
  const text = `${title} ${content}`;
  
  // 4. 更精准的过滤 - 扩展垃圾关键词
  const noiseKeywords = [
    // 定期讨论
    'weekly', 'daily', 'megathread', 'discussion thread', 'what are you working on',
    'monthly', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday',
    
    // 一般性问题
    'eli5', 'explain like', 'remind me', 'random', 'unpopular opinion',
    
    // 过短标题
    'help', 'question', 'thoughts?', 'advice?', 'tips?',
    
    // 非创业相关
    'meme', 'funny', 'joke', 'lol', 'roast me', 'ama',
    
    // 个人求助
    'how do i', 'should i', 'am i the only one', 'does anyone else'
  ];
  
  if (noiseKeywords.some(keyword => title.includes(keyword))) return false;
  
  // 标题过短或过于模糊
  if (post.title.length < 15) return false;
  
  // 过滤纯链接帖子（通常质量较低）
  if (post.selftext === '' && post.url && !post.url.includes('reddit.com')) {
    return false;
  }
  
  // 过滤被删除的内容
  if (content.includes('[removed]') || content.includes('[deleted]')) return false;
  
  return true;
}

// Classify post into industry
function classifyIndustry(title: string, content: string, subreddit: string): number {
  const text = `${title} ${content}`.toLowerCase();
  const sub = subreddit.toLowerCase();
  
  let bestMatch = 1; // Default to SaaS
  let maxScore = 0;
  
  for (const [industryName, config] of Object.entries(INDUSTRY_MAPPING)) {
    let score = 0;
    
    if (config.subreddits.some(s => s.toLowerCase() === sub)) {
      score += 10;
    }
    
    config.keywords.forEach(keyword => {
      if (text.includes(keyword)) score += 2;
    });
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = config.id;
    }
  }
  
  return bestMatch;
}

interface ProcessedPost {
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  permalink: string;
  reddit_id: string;
  industry_id: number;
  analyzed: boolean;
  analyzed_at: null;
}

// Process and save posts
async function processPosts(posts: RedditPost[], industryId: number, supabaseClient: any): Promise<number> {
  const processedPosts: ProcessedPost[] = [];
  
  for (const post of posts) {
    if (!isValidPost(post)) continue;
    
    const processedPost = {
      title: post.title,
      content: post.selftext || '',
      author: post.author,
      subreddit: post.subreddit,
      upvotes: post.score,
      comments: post.num_comments,
      permalink: `https://reddit.com${post.permalink}`,
      reddit_id: post.id,
      industry_id: industryId,
      analyzed: false,
      analyzed_at: null,
    };
    
    processedPosts.push(processedPost);
  }
  
  if (processedPosts.length === 0) return 0;
  
  console.log(`📝 Attempting to save ${processedPosts.length} posts to database...`);
  
  // First try: Batch upsert for efficiency (ignores duplicates gracefully)
  const { data, error } = await supabaseClient
    .from('raw_reddit_posts')
    .upsert(processedPosts, {
      onConflict: 'reddit_id',
      ignoreDuplicates: true  // Skip duplicates instead of updating
    });
  
  if (!error) {
    // Batch upsert succeeded
    console.log(`✅ Successfully processed ${processedPosts.length} posts for industry ${industryId} (batch upsert)`);
    return processedPosts.length;
  }
  
  // Batch upsert failed, try individual inserts as fallback
  // This ensures that valid posts still get saved even if some duplicates cause issues
  console.warn('Batch upsert failed, falling back to individual inserts:', error);
  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  
  for (const post of processedPosts) {
    try {
      const { error: insertError } = await supabaseClient
        .from('raw_reddit_posts')
        .upsert([post], {
          onConflict: 'reddit_id',
          ignoreDuplicates: true
        });
      
      if (!insertError) {
        successCount++;
      } else if (insertError.code === '23505') {
        // Duplicate key error - this is expected and fine
        duplicateCount++;
      } else {
        console.error(`Error inserting post ${post.reddit_id}:`, insertError);
        errorCount++;
      }
    } catch (individualError) {
      console.error(`Failed to insert post ${post.reddit_id}:`, individualError);
      errorCount++;
    }
  }
  
  console.log(`📊 Individual insert results for industry ${industryId}: ${successCount} new, ${duplicateCount} duplicates, ${errorCount} errors`);
  return successCount;
}

// Update task status and statistics
async function updateTaskStatus(
  supabaseClient: any,
  taskId: number,
  status: string,
  updates: { posts_scraped?: number; posts_processed?: number; error_message?: string } = {}
): Promise<void> {
  const updateData: any = { status };
  
  if (status === 'complete_scrape') {
    updateData.completed_at = new Date().toISOString();
  }
  
  Object.assign(updateData, updates);
  
  const { error } = await supabaseClient
    .from('scrape_tasks')
    .update(updateData)
    .eq('id', taskId);
  
  if (error) {
    console.error(`Error updating task ${taskId}:`, error);
  }
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      industry_ids,
      target_date,
      task_ids,
      batch_id
    }: ScraperRequest = await req.json();
    
    // Validate required parameters
    if (!industry_ids || !Array.isArray(industry_ids) || industry_ids.length === 0) {
      throw new Error('industry_ids is required and must be a non-empty array');
    }
    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      throw new Error('task_ids is required and must be a non-empty array');
    }
    if (industry_ids.length !== task_ids.length) {
      throw new Error('industry_ids and task_ids arrays must have the same length');
    }
    if (!target_date) {
      throw new Error('target_date is required');
    }
    if (!batch_id) {
      throw new Error('batch_id is required');
    }
    
    console.log(`🔍 Starting Reddit scraping for industries: ${industry_ids.join(', ')}, target date: ${target_date}, batch: ${batch_id}`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getRedditAccessToken();
    console.log('✅ Reddit access token obtained');

    // Get subreddits for target industries
    const subreddits = getSubredditsForIndustries(industry_ids);
    console.log(`📝 Processing ${subreddits.length} subreddits for ${industry_ids.length} industries...`);

    let totalProcessed = 0;
    const taskResults: Array<{
      taskId: number;
      industryId: number;
      processed: number;
      success: boolean;
      error?: string;
    }> = [];

    // Process each industry task
    for (let i = 0; i < industry_ids.length; i++) {
      const industryId = industry_ids[i];
      const taskId = task_ids[i];
      
      try {
        console.log(`🏭 Processing industry ${industryId} (task ${taskId})...`);
        
        // Get industry config
        const industryConfig = Object.values(INDUSTRY_MAPPING).find(ind => ind.id === industryId);
        if (!industryConfig) {
          throw new Error(`Industry ${industryId} not found`);
        }
        
        let industryProcessed = 0;
        let industryScraped = 0;
        
        // Process subreddits for this industry (filtered)
        const filteredSubreddits = industryConfig.subreddits.filter(sub => !PROBLEMATIC_SUBREDDITS.has(sub));
        for (const subreddit of filteredSubreddits) {
          try {
            console.log(`📊 Fetching posts from r/${subreddit} for industry ${industryId}...`);
            const posts = await fetchRedditPosts(subreddit, accessToken, target_date);
            industryScraped += posts.length;
            
            if (posts.length > 0) {
              const processed = await processPosts(posts, industryId, supabaseClient);
              industryProcessed += processed;
              console.log(`✅ r/${subreddit}: ${processed} posts processed (${posts.length} fetched)`);
            }
            
            // Rate limiting between subreddits
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`❌ Error processing r/${subreddit} for industry ${industryId}:`, error);
          }
        }
        
        // Update task status to complete_scrape
        await updateTaskStatus(supabaseClient, taskId, 'complete_scrape', {
          posts_scraped: industryScraped,
          posts_processed: industryProcessed
        });
        
        totalProcessed += industryProcessed;
        
        taskResults.push({
          taskId,
          industryId,
          processed: industryProcessed,
          success: true
        });
        
        console.log(`✅ Industry ${industryId} completed: ${industryProcessed} posts processed`);
        
      } catch (error) {
        console.error(`❌ Error processing industry ${industryId}:`, error);
        
        // Update task status to failed
        await updateTaskStatus(supabaseClient, taskId, 'failed', {
          error_message: error.message
        });
        
        taskResults.push({
          taskId,
          industryId,
          processed: 0,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`🎉 Reddit scraping completed! Total posts processed: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${totalProcessed} posts for ${industry_ids.length} industries`,
        totalProcessed,
        industriesProcessed: industry_ids.length,
        taskResults
      } as ScraperResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Reddit scraping failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Reddit scraping failed',
        error: error.message,
        totalProcessed: 0,
        industriesProcessed: 0,
        taskResults: []
      } as ScraperResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
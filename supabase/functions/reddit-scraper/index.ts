import "jsr:@supabase/functions-js/edge-runtime.d.ts"
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

// 6. 移除无效subreddit - 用户要求最大化post数量，所以不过滤任何subreddit
const PROBLEMATIC_SUBREDDITS = new Set<string>([
  // 用户要求最大化数据，所以不过滤任何subreddit
]);

// Industry mapping based on updated PRD (25 industries) - 根据文档完善版本
const INDUSTRY_MAPPING = {
  'SaaS & Cloud Services': {
    id: 1,
    subreddits: ['SaaS', 'cloud', 'aws', 'azure', 'googlecloud', 'SaaSMarketing', 'Entrepreneur', 'Startups', 'Tech', 'growthhacking', 'IndieHackers', 'marketing', 'Productivity'],
    keywords: ['saas', 'software as a service', 'cloud', 'platform', 'subscription', 'api', 'service', 'kubernetes', 'docker', 'serverless', 'microservices']
  },
  'Developer Tools & Platforms': {
    id: 7,
    subreddits: ['Programming', 'devops', 'opensource', 'sysadmin', 'AskProgramming', 'Technology', 'coding', 'compsci', 'algorithms', 'SideProject'],
    keywords: ['development', 'programming', 'code', 'developer', 'tool', 'framework', 'library', 'ide', 'editor', 'version control', 'devops', 'ci/cd']
  },
  'API & Backend Services': {
    id: 12,
    subreddits: ['api', 'backend', 'microservices', 'coding', 'SoftwareArchitecture', 'Kubernetes', 'docker', 'node', 'django'],
    keywords: ['api', 'backend', 'server', 'database', 'microservices', 'rest', 'graphql', 'sql', 'nosql', 'performance', 'scaling', 'architecture']
  },
  'Mobile App Development': {
    id: 222,
    subreddits: ['androiddev', 'iOSProgramming', 'flutter', 'UIUX', 'FlutterDev', 'reactnative', 'ionic'],
    keywords: ['mobile', 'app', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin', 'cross platform', 'mobile ui', 'app store']
  },
  'Web & Frontend Development': {
    id: 223,
    subreddits: ['webdev', 'javascript', 'reactjs', 'webassembly', 'Frontend', 'web_design'],
    keywords: ['web', 'frontend', 'javascript', 'react', 'vue', 'angular', 'css', 'html', 'typescript', 'responsive', 'performance', 'ui/ux']
  },
  'No-Code/Low-Code Platforms': {
    id: 8,
    subreddits: ['NoCode', 'LowCode', 'Bubble', 'Makerpad', 'nocode', 'Airtable', 'zapier'],
    keywords: ['nocode', 'no code', 'low code', 'automation', 'workflow', 'integration', 'zapier', 'bubble', 'webflow', 'airtable', 'citizen developer']
  },
  'Cybersecurity & Privacy': {
    id: 13,
    subreddits: ['cybersecurity', 'netsec', 'cryptography', 'privacytoolsio', 'malware', 'computerforensics', 'reverseengineering', 'ethicalhacking', 'Cybersecurity101', 'CyberSecurityJobs'],
    keywords: ['security', 'cybersecurity', 'privacy', 'encryption', 'protection', 'vulnerability', 'penetration testing', 'malware', 'firewall', 'authentication']
  },
  'AI & Machine Learning': {
    id: 2,
    subreddits: ['MachineLearning', 'datascience', 'OpenAI', 'LLM', 'LanguageTechnology', 'DeepLearning', 'NeuralNetworks', 'ArtificialIntelligence', 'AI'],
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'llm', 'nlp', 'computer vision', 'data science', 'mlops']
  },
  'E-commerce & Retail': {
    id: 4,
    subreddits: ['ecommerce', 'Shopify', 'AmazonSeller', 'AmazonFBA', 'SEO', 'advertising', 'marketing', 'dropship'],
    keywords: ['ecommerce', 'e-commerce', 'retail', 'shop', 'marketplace', 'online store', 'dropshipping', 'amazon', 'shopify', 'payment']
  },
  'Health & Fitness Tech': {
    id: 5,
    subreddits: ['fitness', 'DigitalHealth', 'WearOS', 'healthtech', 'MedTech', 'QuantifiedSelf', 'sleephackers', 'Biohackers', 'healthIT'],
    keywords: ['health', 'healthcare', 'medical', 'fitness', 'wellness', 'telemedicine', 'nutrition', 'mental health', 'wearable', 'health tech']
  },
  'EdTech': {
    id: 6,
    subreddits: ['edtech', 'learnprogramming', 'OnlineTutoring', 'education', 'instructionaldesign', 'Elearning', 'teachers'],
    keywords: ['education', 'edtech', 'learning', 'teaching', 'course', 'training', 'skill', 'knowledge', 'school', 'university', 'lms', 'e-learning']
  },
  'FinTech': {
    id: 3,
    subreddits: ['fintech', 'CryptoCurrency', 'blockchain', 'InsurTech', 'CryptoMarkets', 'Altcoin', 'NFT', 'BitcoinBeginners'],
    keywords: ['fintech', 'finance', 'payment', 'banking', 'cryptocurrency', 'crypto', 'investment', 'trading', 'money', 'blockchain', 'defi']
  },
  'Consumer Services': {
    id: 224,
    subreddits: ['SideHustle', 'smallbusiness', 'freelance', 'BeerMoney', 'DigitalNomad', 'Fiverr'],
    keywords: ['service', 'consumer', 'local', 'home', 'food', 'delivery', 'cleaning', 'repair', 'maintenance', 'gig economy', 'freelance']
  },
  'Enterprise & B2B Services': {
    id: 225,
    subreddits: ['b2b', 'CRM', 'startups', 'Procurement', 'Entrepreneurship'],
    keywords: ['b2b', 'enterprise', 'business', 'crm', 'erp', 'workflow', 'collaboration', 'hr', 'sales', 'marketing', 'project management']
  },
  'Media & Content Creation': {
    id: 226,
    subreddits: ['youtubers', 'podcasting', 'CreatorEconomy', 'SEO', 'vlogging', 'NewTubers', 'ContentCreators', 'photography', 'blogging'],
    keywords: ['content', 'media', 'video', 'audio', 'podcast', 'blog', 'design', 'editing', 'streaming', 'creator', 'influencer', 'social media']
  },
  'Travel & Transportation': {
    id: 227,
    subreddits: ['travel', 'solotravel', 'airbnb', 'wanderlust', 'shoestring', 'travelhacks', 'backpacking', 'DigitalNomad'],
    keywords: ['travel', 'trip', 'vacation', 'hotel', 'flight', 'transportation', 'booking', 'tourism', 'nomad', 'journey']
  },
  'Social & Community': {
    id: 9,
    subreddits: ['socialmedia', 'discord', 'communitymanagement', 'SocialMediaMarketing', 'digital_marketing', 'marketing'],
    keywords: ['social', 'community', 'networking', 'communication', 'collaboration', 'forum', 'chat', 'messaging', 'relationship', 'connection']
  },
  'GreenTech & Sustainability': {
    id: 11,
    subreddits: ['sustainability', 'renewable', 'cleantech', 'RenewableEnergy', 'Envirotech', 'solar'],
    keywords: ['sustainability', 'green', 'eco', 'environment', 'renewable', 'climate', 'carbon', 'energy', 'waste', 'recycling', 'clean tech']
  },
  'Logistics & Supply Chain': {
    id: 228,
    subreddits: ['logistics', 'warehouse', 'operations', 'supplychain', 'inventory'],
    keywords: ['logistics', 'supply chain', 'shipping', 'warehouse', 'inventory', 'freight', 'delivery', 'procurement', 'operations', 'manufacturing']
  },
  'Gaming & Entertainment': {
    id: 10,
    subreddits: ['gaming', 'gamedev', 'VirtualReality', 'GamingIndustry', 'eSports', 'VRGaming', 'boardgames'],
    keywords: ['gaming', 'game', 'entertainment', 'streaming', 'content', 'video game', 'mobile game', 'vr', 'ar', 'unity', 'unreal']
  },
  'Hardware & IoT': {
    id: 231,
    subreddits: ['hardware', 'IOT', 'homeautomation', 'arduino', 'raspberrypi'],
    keywords: ['hardware', 'iot', 'internet of things', 'embedded', 'sensors', 'automation', 'arduino', 'raspberry pi', 'electronics', 'microcontroller']
  },
  'AR/VR & Metaverse': {
    id: 238,
    subreddits: ['virtualreality', 'oculus', 'augmentedreality', 'Metaverse'],
    keywords: ['ar', 'vr', 'augmented reality', 'virtual reality', 'metaverse', 'oculus', 'quest', 'immersive', '3d', 'spatial computing']
  },
  'BioTech & MedTech': {
    id: 239,
    subreddits: ['biotech', 'biotechnology', 'bioinformatics', 'genomics', 'labrats'],
    keywords: ['biotech', 'biotechnology', 'medical technology', 'genomics', 'bioinformatics', 'pharmaceuticals', 'lab', 'research', 'clinical', 'diagnosis']
  },
  'LegalTech': {
    id: 235,
    subreddits: ['legaltech', 'law', 'legaladvice'],
    keywords: ['legal tech', 'law', 'legal', 'compliance', 'contract', 'attorney', 'lawyer', 'paralegal', 'court', 'litigation']
  },
  'PropTech': {
    id: 234,
    subreddits: ['PropTech', 'RealEstate', 'SmartHome'],
    keywords: ['proptech', 'real estate', 'property', 'rental', 'smart home', 'mortgage', 'real estate investment', 'home automation', 'construction', 'architecture']
  },
  'Data Science & Analytics': {
    id: 229,
    subreddits: ['datascience', 'analytics', 'MachineLearning', 'statistics', 'tableau', 'PowerBI', 'bigdata'],
    keywords: ['data science', 'analytics', 'business intelligence', 'big data', 'statistics', 'visualization', 'dashboard', 'reporting', 'insights', 'data mining']
  },
  'Blockchain & Cryptocurrency': {
    id: 230,
    subreddits: ['CryptoCurrency', 'blockchain', 'ethereum', 'Bitcoin', 'DeFi', 'NFT', 'Web3'],
    keywords: ['blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'defi', 'nft', 'web3', 'smart contracts', 'crypto trading', 'digital assets']
  },
  'Audio & Podcast': {
    id: 232,
    subreddits: ['podcasting', 'podcasts', 'audio', 'spotify', 'audioengineering', 'voiceover', 'audiobooks'],
    keywords: ['podcast', 'audio', 'music', 'sound', 'radio', 'voice', 'audiobook', 'streaming', 'recording', 'editing']
  },
  'Design & Creative Tools': {
    id: 233,
    subreddits: ['design', 'graphic_design', 'web_design', 'UI_Design', 'Adobe', 'Figma', 'creativity'],
    keywords: ['design', 'creative', 'graphic design', 'ui/ux', 'adobe', 'figma', 'photoshop', 'illustration', 'branding', 'visual design']
  },
  'AgTech': {
    id: 236,
    subreddits: ['agriculture', 'farming', 'AgTech', 'sustainability', 'food', 'permaculture', 'gardening'],
    keywords: ['agriculture', 'farming', 'agtech', 'food production', 'sustainable farming', 'precision agriculture', 'vertical farming', 'greenhouse', 'crop monitoring', 'livestock']
  },
  'General/Trending Topics': {
    id: 240,
    subreddits: [
      'AskReddit', 'IAMA', 'funny', 'gaming', 'worldnews', 'todayilearned', 
      'aww', 'Music', 'movies', 'memes', 'Showerthoughts', 'science', 
      'pics', 'Jokes', 'news', 'explainlikeimfive', 'books', 'food', 
      'LifeProTips', 'DIY', 'GetMotivated', 'askscience'
    ],
    keywords: [
      'general', 'popular', 'trending', 'viral', 'community', 'discussion',
      'entertainment', 'humor', 'advice', 'life', 'culture', 'current events',
      'learning', 'tips', 'motivation', 'science', 'lifestyle', 'social'
    ]
  }
};

// Get subreddits for specific industries - 移除限制
function getSubredditsForIndustries(industryIds: number[]): string[] {
  const subreddits = new Set<string>();
  
  industryIds.forEach(industryId => {
    const industry = Object.values(INDUSTRY_MAPPING).find(ind => ind.id === industryId);
    if (industry) {
      // 使用所有subreddit，不进行任何过滤和限制
      industry.subreddits.forEach(sub => subreddits.add(sub));
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
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'IdeaHunter/1.0';

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

// 1. Fetch posts from a subreddit with top and hot sorting (去掉new) - 大幅优化
async function fetchRedditPosts(subreddit: string, accessToken: string, targetDate: string): Promise<RedditPost[]> {
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'IdeaHunter/1.0';
  const maxRetries = 2; // 减少重试次数
  
  // Convert target date to Unix timestamps for filtering - NOW COVERS 5 DAYS RANGE
  const targetDateObj = new Date(targetDate);
  // Start from 5 days ago (targetDate - 4 days) at 00:00:00
  const startOfRange = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate() - 4, 0, 0, 0);
  // End at target date at 23:59:59
  const endOfRange = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 23, 59, 59);
  const startTimestamp = Math.floor(startOfRange.getTime() / 1000);
  const endTimestamp = Math.floor(endOfRange.getTime() / 1000);
  
  const startDateStr = startOfRange.toISOString().split('T')[0];
  const endDateStr = endOfRange.toISOString().split('T')[0];
  console.log(`📅 Filtering posts for 5-day range: ${startDateStr} to ${endDateStr} (${startTimestamp} - ${endTimestamp})`);
  
  const allPosts: RedditPost[] = [];
  
  // 使用所有Reddit API支持的排序方法以最大化数据抓取
  const sortMethods = [
    { method: 'hot', timeParam: null, maxPages: 2 },      // 热门帖子
    { method: 'top', timeParam: 'day', maxPages: 3 },     // 当日最高评分
    { method: 'top', timeParam: 'week', maxPages: 2 },    // 本周最高评分
    { method: 'top', timeParam: 'month', maxPages: 2 },   // 本月最高评分
    { method: 'new', timeParam: null, maxPages: 4 },      // 最新帖子（最可能有目标日期的内容）
    { method: 'rising', timeParam: null, maxPages: 2 },   // 上升趋势帖子
    { method: 'controversial', timeParam: 'day', maxPages: 2 },  // 当日争议性帖子
    { method: 'controversial', timeParam: 'week', maxPages: 1 }  // 本周争议性帖子
  ];
  
  for (const sortConfig of sortMethods) {
    const { method: sortMethod, timeParam, maxPages } = sortConfig;
    let after: string | null = null;
    let totalFetched = 0;
    let emptyPages = 0; // 空页面计数
    const maxEmptyPages = 1; // 最多1个空页面就停止

    console.log(`📊 Fetching ${sortMethod} posts from r/${subreddit}...`);

    for (let page = 0; page < maxPages; page++) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const params = new URLSearchParams({
            limit: '50', // 减少单页数量，更快处理
            raw_json: '1'
          });
          
          if (timeParam) {
            params.set('t', timeParam);
          }
          
          if (after) {
            params.set('after', after);
          }

          const url = `https://oauth.reddit.com/r/${subreddit}/${sortMethod}?${params}`;
          console.log(`🔗 Fetching: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': userAgent,
            },
          });

          if (response.status === 429) {
            const retryAfter = Math.min(parseInt(response.headers.get('retry-after') || '30', 10), 30); // 限制最大等待时间
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
          
          console.log(`📥 原始获取到 ${posts.length} 个帖子来自 r/${subreddit}`);
          
          // 提前过滤 - 预过滤低质量帖子
          const preFiltedPosts = posts.filter(post => {
            if (!post.title || post.title === '[deleted]' || post.title === '[removed]') return false;
            if (!post.author || post.author === '[deleted]') return false;
            if (post.score < 3 || post.num_comments < 1) return false; // 降低质量门槛
            return true;
          });
          
          console.log(`🔍 质量预过滤: ${posts.length} -> ${preFiltedPosts.length} (过滤掉 ${posts.length - preFiltedPosts.length} 个低质量帖子)`);
          
          // 详细的日期过滤日志
          let dateFilteredCount = 0;
          let samplePostDates: Array<{
            title: string;
            timestamp: number;
            date: string;
            isInRange: boolean;
          }> = [];
          
          // Filter posts by target date
          const datePosts = preFiltedPosts.filter(post => {
            const postTimestamp = post.created_utc;
            const postDate = new Date(postTimestamp * 1000);
            const isInRange = postTimestamp >= startTimestamp && postTimestamp <= endTimestamp;
            
            // 收集样本数据用于调试
            if (samplePostDates.length < 3) {
              samplePostDates.push({
                title: post.title.substring(0, 50) + '...',
                timestamp: postTimestamp,
                date: postDate.toISOString(),
                isInRange: isInRange
              });
            }
            
            if (isInRange) dateFilteredCount++;
            return isInRange;
          });
          
          console.log(`📅 日期过滤详情 for r/${subreddit} (5天范围):`);
          console.log(`   目标日期范围: ${new Date(startTimestamp * 1000).toISOString()} 到 ${new Date(endTimestamp * 1000).toISOString()}`);
          console.log(`   过滤前: ${preFiltedPosts.length} 个帖子`);
          console.log(`   过滤后: ${datePosts.length} 个帖子`);
          if (samplePostDates.length > 0) {
            console.log(`   样本帖子时间:`);
            samplePostDates.forEach((sample, i) => {
              console.log(`     ${i+1}. ${sample.title}`);
              console.log(`        时间: ${sample.date} (${sample.isInRange ? '✅' : '❌'})`);
            });
          }
          
          // 进一步的内容质量检查
          const validPosts = datePosts.filter(post => isValidPost(post));
          console.log(`📝 内容质量过滤: ${datePosts.length} -> ${validPosts.length} (过滤掉 ${datePosts.length - validPosts.length} 个低质量内容)`);
          
          console.log(`📊 r/${subreddit} 最终统计: ${posts.length} -> ${preFiltedPosts.length} -> ${datePosts.length} -> ${validPosts.length}`);
          
          if (datePosts.length === 0) {
            emptyPages++;
            if (emptyPages >= maxEmptyPages) {
              console.log(`🛑 Stopping fetch for r/${subreddit} due to empty pages`);
              break;
            }
          } else {
            emptyPages = 0; // 重置空页面计数
          }
          
          // 更激进的质量检查 - 如果这页质量太低就停止
          if (datePosts.length > 0 && validPosts.length / datePosts.length < 0.2) {
            console.log(`⚠️ Low quality ratio for r/${subreddit}, stopping early`);
            break;
          }
          
          allPosts.push(...datePosts);
          totalFetched += datePosts.length;
          
          after = data.data.after;
          
          if (!after || datePosts.length === 0) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 500)); // 减少延迟
          break;
          
        } catch (error) {
          console.error(`Error fetching r/${subreddit} ${sortMethod} page ${page}, retry ${retries + 1}:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            console.error(`Max retries reached for r/${subreddit} ${sortMethod}, skipping`);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // 减少重试延迟
        }
      }
      
      if (retries >= maxRetries || emptyPages >= maxEmptyPages) break;
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

// 4. Enhanced post validation with more precise filtering - 更严格的过滤
function isValidPost(post: RedditPost): boolean {
  if (!post.title || post.title === '[deleted]' || post.title === '[removed]') return false;
  if (!post.author || post.author === '[deleted]') return false;
  if (post.score < 3 || post.num_comments < 1) return false; // 降低质量门槛
  
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
    'how do i', 'should i', 'am i the only one', 'does anyone else',
    
    // 新增过滤词
    'showerthought', 'shower thought', 'rant', 'confession',
    'unpopular', 'change my mind', 'cmv', 'meta',
    'circlejerk', 'satire', 'parody'
  ];
  
  if (noiseKeywords.some(keyword => title.includes(keyword))) return false;
  
  // 标题过短或过于模糊
  if (post.title.length < 20) return false; // 提高最小长度
  
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
  created_at: string;  // Reddit帖子的原始创建时间
  analyzed: boolean;
  analyzed_at: null;
  processing_status: string;
  priority_score: number | null;
}

// Process and save posts
async function processPosts(posts: RedditPost[], industryId: number, supabaseClient: any): Promise<number> {
  const processedPosts: ProcessedPost[] = [];
  
  for (const post of posts) {
    if (!isValidPost(post)) continue;
    
    // Convert Reddit's Unix timestamp to ISO string
    const redditCreatedAt = new Date(post.created_utc * 1000).toISOString();
    
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
      created_at: redditCreatedAt,  // 使用Reddit帖子的原始创建时间
      analyzed: false,
      analyzed_at: null,
      processing_status: 'unprocessed', // 确保新posts设置为unprocessed状态
      priority_score: null // 让 deepseek-analyzer 来计算优先级分数
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

// 并发处理subreddit - 新增函数
async function fetchRedditPostsConcurrently(subreddits: string[], accessToken: string, targetDate: string): Promise<RedditPost[]> {
  const maxConcurrency = 10; // 提高并发数到10
  const allPosts: RedditPost[] = [];
  
  // 分批处理subreddit
  for (let i = 0; i < subreddits.length; i += maxConcurrency) {
    const batch = subreddits.slice(i, i + maxConcurrency);
    
    console.log(`🔄 Processing batch ${Math.floor(i/maxConcurrency) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(subreddit => 
      Promise.race([
        fetchRedditPosts(subreddit, accessToken, targetDate),
        new Promise<RedditPost[]>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout: ${subreddit}`)), 10000) // 10秒超时
        )
      ]).catch(error => {
        console.error(`❌ Failed to fetch from r/${subreddit}:`, error.message);
        return []; // 返回空数组而不是失败
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // 合并结果
    batchResults.forEach(posts => allPosts.push(...posts));
    
    // 批次间延迟减少到0.5秒
    if (i + maxConcurrency < subreddits.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allPosts;
}

// Main serve function
Deno.serve(async (req) => {
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
        
        // 使用并发处理获取所有帖子 - 使用全部subreddit
        const allSubreddits = industryConfig.subreddits; // 使用所有subreddit
          
        console.log(`📊 Fetching posts from ${allSubreddits.length} subreddits for industry ${industryId}: ${allSubreddits.join(', ')}`);
        
        // 并发获取所有帖子
        const allPosts = await fetchRedditPostsConcurrently(allSubreddits, accessToken, target_date);
        industryScraped = allPosts.length;
        
        if (allPosts.length > 0) {
          // 批量处理所有帖子
          const processed = await processPosts(allPosts, industryId, supabaseClient);
          industryProcessed = processed;
          console.log(`✅ Industry ${industryId}: ${processed} posts processed (${allPosts.length} fetched)`);
        } else {
          console.log(`⚠️ No posts found for industry ${industryId}`);
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
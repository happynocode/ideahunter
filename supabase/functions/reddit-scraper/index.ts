import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface RedditEndpoint {
  path: string;
  params: string;
}

// Industry mapping based on updated PRD (20 industries)
const INDUSTRY_MAPPING = {
  'SaaS & 云服务': {
    id: 1,
    subreddits: ['SaaS', 'SaaSgrowth', 'cloud', 'aws', 'azure', 'googlecloud', 'kubernetes', 'docker', 'CloudComputing', 'SaaSSales', 'techsales', 'saastools', 'cloudnative', 'serverless'],
    keywords: ['saas', 'software as a service', 'cloud', 'platform', 'subscription', 'api', 'service', 'kubernetes', 'docker', 'serverless', 'microservices']
  },
  '开发者工具 & 平台': {
    id: 2,
    subreddits: ['Programming', 'devops', 'git', 'github', 'vscode', 'IntelliJIDEA', 'vim', 'tooling', 'opensource', 'ExperiencedDevs', 'SoftwareArchitecture', 'codereview', 'devtools', 'productivity', 'technology'],
    keywords: ['development', 'programming', 'code', 'developer', 'tool', 'framework', 'library', 'ide', 'editor', 'version control', 'devops', 'ci/cd']
  },
  'API & 后端服务': {
    id: 12,
    subreddits: ['api', 'backend', 'node', 'golang', 'rust', 'python', 'java', 'microservices', 'Database', 'PostgreSQL', 'mongodb', 'redis', 'APIDesign', 'graphql', 'RESTful'],
    keywords: ['api', 'backend', 'server', 'database', 'microservices', 'rest', 'graphql', 'sql', 'nosql', 'performance', 'scaling', 'architecture']
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
  '低/无代码平台': {
    id: 8,
    subreddits: ['NoCode', 'LowCode', 'automate', 'zapier', 'Bubble', 'Webflow', 'Airtable', 'notion', 'integrations', 'workflow', 'automation', 'IFTTT', 'make'],
    keywords: ['nocode', 'no code', 'low code', 'automation', 'workflow', 'integration', 'zapier', 'bubble', 'webflow', 'airtable', 'citizen developer']
  },
  '网络安全 & 隐私': {
    id: 13,
    subreddits: ['cybersecurity', 'netsec', 'AskNetsec', 'privacy', 'security', 'hacking', 'malware', 'cryptography', 'InfoSec', 'penetrationtesting', 'blueteam', 'redteam', 'OSINT'],
    keywords: ['security', 'cybersecurity', 'privacy', 'encryption', 'protection', 'vulnerability', 'penetration testing', 'malware', 'firewall', 'authentication']
  },
  'AI & 机器学习': {
    id: 2,
    subreddits: ['MachineLearning', 'artificial', 'ArtificialIntelligence', 'deeplearning', 'datascience', 'LocalLLaMA', 'LangChain', 'OpenAI', 'MLOps', 'tensorflow', 'pytorch', 'NLP', 'computervision', 'AIforEveryone', 'science', 'dataisbeautiful'],
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'llm', 'nlp', 'computer vision', 'data science', 'mlops']
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
  '金融科技': {
    id: 3,
    subreddits: ['fintech', 'PersonalFinance', 'investing', 'CryptoCurrency', 'financialindependence', 'OpenBanking', 'CreditCards', 'FIRE', 'StockMarket', 'RobinHood', 'DeFi', 'blockchain', 'bitcoin', 'crypto'],
    keywords: ['fintech', 'finance', 'payment', 'banking', 'cryptocurrency', 'crypto', 'investment', 'trading', 'money', 'blockchain', 'defi']
  },
  '消费者服务': {
    id: 224,
    subreddits: ['SideHustle', 'smallbusiness', 'freelance', 'gig', 'food', 'cooking', 'DIY', 'homeimprovement', 'FieldService', 'Contractor', 'cleaning', 'delivery', 'services', 'handyman'],
    keywords: ['service', 'consumer', 'local', 'home', 'food', 'delivery', 'cleaning', 'repair', 'maintenance', 'gig economy', 'freelance']
  },
  '企业服务 & B2B': {
    id: 225,
    subreddits: ['b2b', 'businessdev', 'sales', 'marketing', 'CRM', 'ERP', 'HumanResources', 'accounting', 'projectmanagement', 'productivity', 'workflow', 'collaboration', 'communication', 'remotework', 'entrepreneur', 'startups', 'business'],
    keywords: ['b2b', 'enterprise', 'business', 'crm', 'erp', 'workflow', 'productivity', 'collaboration', 'hr', 'sales', 'marketing', 'project management']
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
  '社交 & 社区': {
    id: 9,
    subreddits: ['socialmedia', 'communitymanagement', 'onlinecommunities', 'socialplatforms', 'ModSupport', 'CommunityManager', 'discord', 'slack', 'reddit', 'networking', 'dating', 'relationships'],
    keywords: ['social', 'community', 'networking', 'communication', 'collaboration', 'forum', 'chat', 'messaging', 'relationship', 'connection']
  },
  '绿色 & 可持续科技': {
    id: 11,
    subreddits: ['sustainability', 'zerowaste', 'environment', 'solar', 'renewable', 'climatechange', 'greentech', 'cleanenergy', 'recycling', 'composting', 'upcycling', 'carbonfootprint', 'ESG'],
    keywords: ['sustainability', 'green', 'eco', 'environment', 'renewable', 'climate', 'carbon', 'energy', 'waste', 'recycling', 'clean tech']
  },
  '物流 & 供应链': {
    id: 228,
    subreddits: ['logistics', 'supplychain', 'freight', 'warehouse', 'FreightBrokers', 'SupplyChainLogistics', '3PL', 'shipping', 'inventory', 'procurement', 'manufacturing', 'operations', 'lean'],
    keywords: ['logistics', 'supply chain', 'shipping', 'warehouse', 'inventory', 'freight', 'delivery', 'procurement', 'operations', 'manufacturing']
  },
  '游戏 & 娱乐': {
    id: 10,
    subreddits: ['gaming', 'gamedev', 'IndieGaming', 'Unity3D', 'unrealengine', 'godot', 'MobileGaming', 'VirtualReality', 'AR', 'streaming', 'twitch', 'youtube', 'entertainment'],
    keywords: ['gaming', 'game', 'entertainment', 'streaming', 'content', 'video game', 'mobile game', 'vr', 'ar', 'unity', 'unreal']
  }
};

// Get all unique subreddits from industry mapping
const getAllSubreddits = (): string[] => {
  const subreddits = new Set<string>();
  Object.values(INDUSTRY_MAPPING).forEach(industry => {
    industry.subreddits.forEach(sub => subreddits.add(sub));
  });
  return Array.from(subreddits);
};

// Reddit API authentication with retry
async function getRedditAccessToken(): Promise<string> {
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
  return data.access_token;
}

// Fetch posts from a subreddit with pagination to get ALL posts within time range
async function fetchRedditPosts(subreddit: string, accessToken: string, timeRange: string = '24h'): Promise<RedditPost[]> {
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'ScraperDash/1.0';
  const maxRetries = 3;
  
  // Convert timeRange to Reddit API parameter
  let timeParam = 'day'; // default to 24h
  switch (timeRange) {
    case '1h':
      timeParam = 'hour';
      break;
    case '24h':
    case '1d':
      timeParam = 'day';
      break;
    case '7d':
    case '1w':
      timeParam = 'week';
      break;
    case '30d':
    case '1m':
      timeParam = 'month';
      break;
    default:
      timeParam = 'day';
  }
  
  // Set reasonable limits per time range
  let maxPostsLimit = 25; // Default for 1 hour and 1 day
  switch (timeRange) {
    case '1h':
      maxPostsLimit = 30; // 1 hour: 30 posts per subreddit
      break;
    case '24h':
    case '1d':
      maxPostsLimit = 100; // 1 day: 100 posts per subreddit
      break;
    case '7d':
    case '1w':
      maxPostsLimit = 300; // 7 days: 300 posts per subreddit  
      break;
    case '30d':
    case '1m':
      maxPostsLimit = 500; // 30 days: 500 posts per subreddit
      break;
    default:
      maxPostsLimit = 100;
  }
  
  const cutoffTime = getTimeRangeCutoff(timeRange);
  const allPosts: RedditPost[] = [];
  
  console.log(`Fetching up to ${maxPostsLimit} posts from r/${subreddit} for ${timeRange}`);
  
  // For longer time ranges, use multiple endpoints to get more comprehensive data
  const endpoints: RedditEndpoint[] = [];
  
  if (timeRange === '1h' || timeRange === '24h' || timeRange === '1d') {
    // For recent posts, prioritize hot and new
    endpoints.push(
      { path: 'hot', params: `limit=100` },
      { path: 'new', params: `limit=100` },
      { path: 'top', params: `t=${timeParam}&limit=100` }
    );
  } else {
    // For longer periods, use top with different time parameters and rising
    endpoints.push(
      { path: 'top', params: `t=${timeParam}&limit=100` },
      { path: 'new', params: `limit=100` }, // New posts regardless of time
      { path: 'hot', params: `limit=100` }, // Currently hot posts
      { path: 'rising', params: `limit=100` } // Rising posts
    );
  }
  
  const seenPostIds = new Set<string>();
  
  // Fetch from multiple endpoints
  for (const endpoint of endpoints) {
    if (allPosts.length >= maxPostsLimit) break;
    
    console.log(`Fetching from r/${subreddit}/${endpoint.path} with params: ${endpoint.params}`);
    
    let after: string | null = null;
    let hasMorePosts = true;
    let pageCount = 0;
    const maxPagesPerEndpoint = Math.ceil(maxPostsLimit / (endpoints.length * 100));
    
    while (hasMorePosts && pageCount < maxPagesPerEndpoint && allPosts.length < maxPostsLimit) {
      pageCount++;
      let success = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Build URL with pagination
          let url = `https://oauth.reddit.com/r/${subreddit}/${endpoint.path}?${endpoint.params}`;
          if (after) {
            url += `&after=${after}`;
          }
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': userAgent,
            }
          });

          if (response.status === 429) {
            // Rate limited, wait and retry
            const retryAfter = parseInt(response.headers.get('retry-after') || '60');
            console.log(`Rate limited on r/${subreddit}/${endpoint.path} page ${pageCount}, waiting ${retryAfter}s...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }

          if (!response.ok) {
            if (response.status === 404 || response.status === 403) {
              console.log(`Subreddit r/${subreddit} not accessible (${response.status}), skipping endpoint ${endpoint.path}`);
              hasMorePosts = false;
              break;
            }
            if (attempt === maxRetries) {
              console.error(`Failed to fetch r/${subreddit}/${endpoint.path} page ${pageCount}: ${response.status} after ${maxRetries} attempts`);
              hasMorePosts = false;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          const data: RedditResponse = await response.json();
          const posts = data.data.children.map(child => child.data).filter(post => post.id);
          
          if (posts.length === 0) {
            console.log(`No more posts found for r/${subreddit}/${endpoint.path} at page ${pageCount}`);
            hasMorePosts = false;
            break;
          }
          
          // Filter posts by time and remove duplicates
          const newPosts: RedditPost[] = [];
          let oldPostCount = 0;
          
          for (const post of posts) {
            // Skip if we've already seen this post
            if (seenPostIds.has(post.id)) continue;
            
            const postTime = new Date(post.created_utc * 1000);
            if (postTime >= cutoffTime) {
              newPosts.push(post);
              seenPostIds.add(post.id);
            } else {
              oldPostCount++;
            }
          }
          
          allPosts.push(...newPosts);
          console.log(`Added ${newPosts.length} new posts from r/${subreddit}/${endpoint.path} (${oldPostCount} were too old or duplicates)`);
          
          // For 'new' and 'hot' endpoints, we don't need to worry about time filtering as much
          // But for 'top' with time parameters, stop if we get too many old posts
          const shouldStopForOldPosts = endpoint.path === 'top' && oldPostCount > posts.length * 0.7;
          
          // Check if we've reached our post limit or found too many old posts
          if (allPosts.length >= maxPostsLimit) {
            console.log(`Reached post limit of ${maxPostsLimit} for r/${subreddit}/${endpoint.path}`);
            hasMorePosts = false;
          } else if (shouldStopForOldPosts) {
            console.log(`Too many old posts for r/${subreddit}/${endpoint.path}, moving to next endpoint`);
            hasMorePosts = false;
          } else if (posts.length < 100) {
            console.log(`Fewer than 100 posts returned for r/${subreddit}/${endpoint.path}, likely reached end`);
            hasMorePosts = false;
          } else {
            // Set up for next page
            after = data.data.after;
            if (!after) {
              console.log(`No more pages available for r/${subreddit}/${endpoint.path}`);
              hasMorePosts = false;
            }
          }
          
          success = true;
          break;
          
        } catch (error) {
          console.error(`Error fetching r/${subreddit}/${endpoint.path} page ${pageCount} (attempt ${attempt}):`, error);
          if (attempt === maxRetries) {
            hasMorePosts = false;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!success) {
        break;
      }
      
      // Small delay between pages to be respectful to Reddit API
      if (hasMorePosts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Delay between different endpoints
    if (allPosts.length < maxPostsLimit) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Trim to exact limit if we went over
  if (allPosts.length > maxPostsLimit) {
    allPosts.splice(maxPostsLimit);
  }
  
  console.log(`Collected ${allPosts.length} unique posts from r/${subreddit} across ${endpoints.length} endpoints (${timeRange})`);
  return allPosts;
}

// Helper function to get cutoff time based on range
function getTimeRangeCutoff(timeRange: string): Date {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 1 * 60 * 60 * 1000);
    case '24h':
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
    case '1w':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
    case '1m':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

// Validate post based on PRD criteria
function isValidPost(post: RedditPost): boolean {
  // Skip deleted/removed posts
  if (!post.title || post.title === '[deleted]' || post.title === '[removed]') return false;
  if (!post.author || post.author === '[deleted]') return false;
  
  // PRD criteria: upvotes >= 5 and comments >= 2
  if (post.score < 5 || post.num_comments < 2) return false;
  
  // Skip common noise
  const title = post.title.toLowerCase();
  const noiseKeywords = ['weekly', 'daily', 'megathread', 'discussion thread', 'what are you working on'];
  if (noiseKeywords.some(keyword => title.includes(keyword))) return false;
  
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
    
    // Check if subreddit matches
    if (config.subreddits.some(s => s.toLowerCase() === sub)) {
      score += 10;
    }
    
    // Check keyword matches
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

// Process and save posts concurrently
async function processPosts(posts: RedditPost[], supabaseClient: any): Promise<number> {
  const processedPosts = [];
  
  for (const post of posts) {
    if (!isValidPost(post)) continue;
    
    const industryId = classifyIndustry(post.title, post.selftext || '', post.subreddit);
    
    // Check for duplicates
    const { data: existing } = await supabaseClient
      .from('raw_reddit_posts')
      .select('id')
      .eq('reddit_id', post.id)
      .single();
    
    if (existing) continue;
    
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
      // 🆕 新posts默认为未分析状态
      analyzed: false,
      analyzed_at: null,
    };
    
    processedPosts.push(processedPost);
  }
  
  if (processedPosts.length === 0) return 0;
  
  // Batch insert
  const { error } = await supabaseClient
    .from('raw_reddit_posts')
    .insert(processedPosts);
  
  if (error) {
    console.error('Error inserting posts:', error);
    return 0;
  }
  
  return processedPosts.length;
}

// Auto-trigger DeepSeek analyzer after successful scraping
async function triggerDeepSeekAnalyzer(timeRange: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    console.log(`🤖 Auto-triggering DeepSeek analyzer for ${timeRange}...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for analyzer trigger');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/deepseek-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        timeRange,
        autoTriggered: true 
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ DeepSeek analyzer triggered successfully: ${result.message}`);
      return { success: true, message: result.message, data: result };
    } else {
      console.error(`❌ DeepSeek analyzer trigger failed: ${result.error}`);
      return { success: false, message: result.error };
    }
    
  } catch (error) {
    console.error(`❌ Error triggering DeepSeek analyzer:`, error);
    return { success: false, message: error.message };
  }
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}));
    const timeRange = body.timeRange || '24h';
    
    console.log(`🔍 Starting Reddit scraping for ${timeRange}...`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getRedditAccessToken();
    console.log('✅ Reddit access token obtained');

    const subreddits = getAllSubreddits();
    console.log(`📝 Processing ${subreddits.length} subreddits for ${timeRange}...`);

    let totalProcessed = 0;
    const results = [];

    // Process subreddits in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < subreddits.length; i += batchSize) {
      const batch = subreddits.slice(i, i + batchSize);
      
      for (const subreddit of batch) {
        try {
          console.log(`📊 Fetching posts from r/${subreddit}...`);
          const posts = await fetchRedditPosts(subreddit, accessToken, timeRange);
          
          if (posts.length > 0) {
            const processed = await processPosts(posts, supabaseClient);
            totalProcessed += processed;
            results.push({
              subreddit,
              fetched: posts.length,
              processed,
              success: true
            });
            console.log(`✅ r/${subreddit}: ${processed} posts processed (${posts.length} fetched)`);
          } else {
            results.push({
              subreddit,
              fetched: 0,
              processed: 0,
              success: true,
              message: 'No posts found'
            });
          }
        } catch (error) {
          console.error(`❌ Error processing r/${subreddit}:`, error);
          results.push({
            subreddit,
            fetched: 0,
            processed: 0,
            success: false,
            error: error.message
          });
        }
        
        // Rate limiting between subreddits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Rate limiting between batches
      if (i + batchSize < subreddits.length) {
        console.log(`⏸️ Batch completed, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`🎉 Reddit scraping completed! Total posts processed: ${totalProcessed}`);

    // Auto-trigger DeepSeek analyzer
    const analyzerResult = await triggerDeepSeekAnalyzer(timeRange);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully scraped and processed ${totalProcessed} posts`,
        totalScraped: totalProcessed,
        timeRange,
        subredditsProcessed: results.length,
        results,
        analyzerTriggered: analyzerResult.success,
        analyzerMessage: analyzerResult.message
      }),
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
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
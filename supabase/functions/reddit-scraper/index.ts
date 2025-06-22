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
    case '24h':
    case '1d':
      maxPostsLimit = 25;
      break;
    case '7d':
    case '1w':
      maxPostsLimit = 100; // 7 days limit: 100 posts per subreddit
      break;
    case '30d':
    case '1m':
      maxPostsLimit = 400; // 30 days limit: 400 posts per subreddit
      break;
    default:
      maxPostsLimit = 25;
  }
  
  const cutoffTime = getTimeRangeCutoff(timeRange);
  const allPosts: RedditPost[] = [];
  let after: string | null = null;
  let hasMorePosts = true;
  let pageCount = 0;
  const maxPages = Math.ceil(maxPostsLimit / 100); // Calculate pages needed based on limit
  
  console.log(`Fetching up to ${maxPostsLimit} posts from r/${subreddit} for ${timeRange}`);
  
  while (hasMorePosts && pageCount < maxPages) {
    pageCount++;
    let success = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Build URL with pagination
        let url = `https://oauth.reddit.com/r/${subreddit}/top?t=${timeParam}&limit=100`;
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
          console.log(`Rate limited on r/${subreddit} page ${pageCount}, waiting ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (!response.ok) {
          if (attempt === maxRetries) {
            console.error(`Failed to fetch r/${subreddit} page ${pageCount}: ${response.status} after ${maxRetries} attempts`);
            hasMorePosts = false;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        const data: RedditResponse = await response.json();
        const posts = data.data.children.map(child => child.data).filter(post => post.id);
        
        if (posts.length === 0) {
          console.log(`No more posts found for r/${subreddit} at page ${pageCount}`);
          hasMorePosts = false;
          break;
        }
        
        // Filter posts by time - but don't stop pagination early
        // Reddit's "top" sorting mixes posts by popularity, not strict chronological order
        const timeFilteredPosts = [];
        let oldPostCount = 0;
        
        for (const post of posts) {
          const postTime = new Date(post.created_utc * 1000);
          if (postTime >= cutoffTime) {
            timeFilteredPosts.push(post);
          } else {
            oldPostCount++;
          }
        }
        
        // Only stop if we get too many consecutive old posts (indicating we've moved into older content)
        const foundTooManyOldPosts = oldPostCount > posts.length * 0.8; // 80% of posts are old
        
                 allPosts.push(...timeFilteredPosts);
         
         // Check if we've reached our post limit
         if (allPosts.length >= maxPostsLimit) {
           console.log(`Reached post limit of ${maxPostsLimit} for r/${subreddit}`);
           // Trim to exact limit if we went over
           if (allPosts.length > maxPostsLimit) {
             allPosts.splice(maxPostsLimit);
           }
           hasMorePosts = false;
         } else if (foundTooManyOldPosts || posts.length < 100) {
           console.log(`Reached end of relevant posts for r/${subreddit} (${foundTooManyOldPosts ? 'too many old posts' : 'end of posts'})`);
           hasMorePosts = false;
         } else {
           // Set up for next page
           after = data.data.after;
           if (!after) {
             console.log(`No more pages available for r/${subreddit}`);
             hasMorePosts = false;
           }
         }
        
        success = true;
        break;
        
      } catch (error) {
        console.error(`Error fetching r/${subreddit} page ${pageCount} (attempt ${attempt}):`, error);
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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`Collected ${allPosts.length} posts from r/${subreddit} across ${pageCount} pages (${timeRange})`);
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
    
    console.log(`📡 Calling deepseek-analyzer: ${supabaseUrl}/functions/v1/deepseek-analyzer`);
    
    // Set a short timeout just to verify the call can be initiated
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${supabaseUrl}/functions/v1/deepseek-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        timeRange,
        forceAnalyze: false,
        autoTriggered: true
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log(`📡 DeepSeek analyzer response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DeepSeek analyzer HTTP error: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `DeepSeek analyzer call failed: HTTP ${response.status}`,
        data: null
      };
    }
    
    // Don't wait for the full response, just confirm it started successfully
    console.log(`✅ DeepSeek analyzer successfully triggered and running in background`);
    return {
      success: true,
      message: `DeepSeek analyzer successfully triggered and running in background`,
      data: { status: 'started' }
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️ DeepSeek analyzer call initiated (timed out waiting for response, but this is expected)`);
      return {
        success: true,
        message: `DeepSeek analyzer successfully triggered (running in background)`,
        data: { status: 'timeout_expected' }
      };
    }
    
    console.error(`💥 Error triggering DeepSeek analyzer:`, error);
    return {
      success: false,
      message: `Error triggering DeepSeek analyzer: ${error.message}`,
      data: null
    };
  }
}

// Update daily stats
async function updateDailyStats(supabaseClient: any, newIdeasCount: number) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await supabaseClient
    .from('daily_stats')
    .select('*')
    .eq('date', today)
    .single();
  
  if (existing) {
    await supabaseClient
      .from('daily_stats')
      .update({
        totalIdeas: existing.totalIdeas + newIdeasCount,
        updatedAt: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    await supabaseClient
      .from('daily_stats')
      .insert({
        date: today,
        totalIdeas: newIdeasCount,
        newIndustries: 0,
        avgUpvotes: 0,
        successRate: 85
      });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // JWT Verification: Allow both authenticated users and service role calls
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    
    // Create supabase client with the provided token for verification
    let supabaseClient;
    
    if (token === Deno.env.get('SUPABASE_ANON_KEY')) {
      // If using anon key, verify if there's a valid JWT in the request
      const jwt = req.headers.get('authorization');
      if (jwt && jwt.includes('Bearer ')) {
        // Try to create client with anon key first
        const anonClient = createClient(supabaseUrl, token);
        // Check if we can access user info (this validates the JWT)
        try {
          const { data: { user }, error } = await anonClient.auth.getUser(jwt.replace('Bearer ', ''));
          if (error || !user) {
            // If no valid user JWT, fall back to service role for scheduled/admin operations
            supabaseClient = createClient(supabaseUrl, serviceRoleKey);
          } else {
            supabaseClient = anonClient;
          }
        } catch {
          // Fall back to service role
          supabaseClient = createClient(supabaseUrl, serviceRoleKey);
        }
      } else {
        supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      }
    } else if (token === serviceRoleKey) {
      // Direct service role access (from scheduler or internal calls)
      supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    } else {
      // Assume it's a user JWT token
      try {
        supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);
        if (error || !user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid JWT token'
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        // For authenticated users, still use service role for database operations
        supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'JWT verification failed'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Get parameters from request body
    const body = await req.json().catch(() => ({}));
    const timeRange = body.timeRange || '24h'; // '1h', '24h', '7d', '30d'
    
    console.log(`Starting concurrent Reddit scraping process for ${timeRange}...`);
    
    // Get Reddit access token
    const accessToken = await getRedditAccessToken();
    console.log('Successfully authenticated with Reddit API');
    
    // Get all subreddits to scrape
    const subreddits = getAllSubreddits();
    console.log(`Scraping ${subreddits.length} subreddits concurrently for ${timeRange} timeframe...`);
    
    // Scrape all subreddits concurrently with rate limiting
    const concurrencyLimit = 5; // Limit concurrent requests to avoid rate limits
    let totalScraped = 0;
    const results = [];
    
    for (let i = 0; i < subreddits.length; i += concurrencyLimit) {
      const batch = subreddits.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (subreddit) => {
        try {
          console.log(`Scraping r/${subreddit} for ${timeRange}...`);
          const posts = await fetchRedditPosts(subreddit, accessToken, timeRange);
          
          if (posts.length > 0) {
            const processed = await processPosts(posts, supabaseClient);
            console.log(`Processed ${processed} posts from r/${subreddit} (${timeRange})`);
            return { subreddit, processed, error: null };
          }
          
          return { subreddit, processed: 0, error: null };
        } catch (error) {
          console.error(`Error processing r/${subreddit}:`, error);
          return { subreddit, processed: 0, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + concurrencyLimit < subreddits.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Calculate totals
    totalScraped = results.reduce((sum, result) => sum + result.processed, 0);
    const errors = results.filter(r => r.error).map(r => ({ subreddit: r.subreddit, error: r.error }));
    
    console.log(`Scraping completed. Total posts processed: ${totalScraped} (${timeRange})`);
    
    // Update daily stats
    await updateDailyStats(supabaseClient, totalScraped);

    // Auto-trigger DeepSeek analyzer after successful scraping
    let analyzerResult = null;
    if (totalScraped > 0) {
      console.log('🤖 Triggering DeepSeek analyzer...');
      // Start analyzer asynchronously but wait for startup confirmation
      analyzerResult = await triggerDeepSeekAnalyzer(timeRange);
      console.log(`🤖 DeepSeek analyzer ${analyzerResult.success ? '✅ Started successfully' : '❌ Failed to start'} - ${analyzerResult.message}`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully scraped ${totalScraped} posts from ${subreddits.length} subreddits (${timeRange}). ${
          totalScraped > 0 
            ? `DeepSeek analyzer ${analyzerResult?.success ? 'started successfully (running in background)' : 'failed to start'}: ${analyzerResult?.message || 'Unknown result'}`
            : 'DeepSeek analyzer skipped (no new posts)'
        }`,
        totalScraped,
        timeRange,
        subredditsProcessed: subreddits.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 5), // Only return first 5 errors
        analyzerTriggered: totalScraped > 0,
        analyzerResult: analyzerResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Reddit scraping failed:', error);
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
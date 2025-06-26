import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubredditInfo {
  name: string;
  display_name: string;
  subscribers: number;
  public_description: string;
  over18: boolean;
  created_utc: number;
  lang: string;
  id: string;
}

interface TrendingDiscoveryResponse {
  success: boolean;
  message: string;
  popular_subreddits: SubredditInfo[];
  rising_subreddits: SubredditInfo[];
  hot_subreddits: SubredditInfo[];
  recommendations: string[];
}

// Cache for Reddit access token
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getRedditAccessToken(): Promise<string> {
  const now = Date.now();
  
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
  
  // Cache token for 55 minutes (Reddit tokens usually expire in 1 hour)
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (55 * 60 * 1000);
  
  return cachedAccessToken!;
}

async function fetchTrendingSubreddits(endpoint: string, accessToken: string, limit: number = 50): Promise<SubredditInfo[]> {
  const userAgent = Deno.env.get('REDDIT_USER_AGENT') || 'IdeaHunter/1.0';
  
  try {
    const url = `https://oauth.reddit.com${endpoint}?limit=${limit}&raw_json=1`;
    console.log(`🔗 Fetching trending subreddits from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data.children)) {
      return [];
    }

    return data.data.children
      .map((child: any) => child.data)
      .filter((sub: any) => sub && sub.display_name && sub.subscribers)
      .map((sub: any): SubredditInfo => ({
        name: sub.name,
        display_name: sub.display_name,
        subscribers: sub.subscribers,
        public_description: sub.public_description || '',
        over18: sub.over18 || false,
        created_utc: sub.created_utc,
        lang: sub.lang || 'en',
        id: sub.id
      }));
  } catch (error) {
    console.error(`❌ Error fetching from ${endpoint}:`, error);
    return [];
  }
}

async function discoverTrendingSubreddits(accessToken: string): Promise<{
  popular: SubredditInfo[];
  rising: SubredditInfo[];
  hot: SubredditInfo[];
}> {
  console.log('🔍 Discovering trending subreddits from multiple Reddit endpoints...');
  
  // Try multiple Reddit API endpoints to discover trending subreddits
  const [popular, rising, hot] = await Promise.allSettled([
    fetchTrendingSubreddits('/subreddits/popular', accessToken, 100),
    fetchTrendingSubreddits('/subreddits/new', accessToken, 50),  // New subreddits that might be trending
    fetchTrendingSubreddits('/subreddits/default', accessToken, 50), // Default subreddits
  ]);

  return {
    popular: popular.status === 'fulfilled' ? popular.value : [],
    rising: rising.status === 'fulfilled' ? rising.value : [],
    hot: hot.status === 'fulfilled' ? hot.value : []
  };
}

function generateRecommendations(trendingData: {
  popular: SubredditInfo[];
  rising: SubredditInfo[];
  hot: SubredditInfo[];
}): string[] {
  const recommendations: string[] = [];
  
  // Filter out NSFW and low-quality subreddits
  const filterSubreddits = (subs: SubredditInfo[]) => 
    subs.filter(sub => 
      !sub.over18 && 
      sub.subscribers > 10000 && 
      sub.lang === 'en' &&
      sub.public_description && 
      sub.public_description.length > 20 &&
      !sub.display_name.toLowerCase().includes('nsfw') &&
      !sub.display_name.toLowerCase().includes('porn') &&
      !sub.display_name.toLowerCase().includes('xxx')
    );

  // Get top popular subreddits for general category
  const topPopular = filterSubreddits(trendingData.popular)
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, 20)
    .map(sub => sub.display_name);

  recommendations.push(
    '📈 Reddit API trending discovery findings:',
    `• Found ${trendingData.popular.length} popular subreddits`,
    `• Found ${trendingData.rising.length} rising subreddits`, 
    `• Found ${trendingData.hot.length} default subreddits`,
    '',
    '🎯 Top recommendations for General category:',
    ...topPopular.map(name => `  - r/${name}`),
    '',
    '💡 API endpoints explored:',
    '  - /subreddits/popular - Most subscribed subreddits',
    '  - /subreddits/new - Recently created subreddits',
    '  - /subreddits/default - Default subreddits',
    '',
    '⚠️ Note: Reddit does not have a specific "trending" endpoint',
    '📊 Consider using /r/all/hot, /r/all/rising for trending posts instead'
  );

  return recommendations;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting Reddit trending discovery...');
    
    // Get Reddit access token
    const accessToken = await getRedditAccessToken();
    
    // Discover trending subreddits
    const trendingData = await discoverTrendingSubreddits(accessToken);
    
    // Generate recommendations
    const recommendations = generateRecommendations(trendingData);
    
    const response: TrendingDiscoveryResponse = {
      success: true,
      message: 'Successfully discovered trending subreddits',
      popular_subreddits: trendingData.popular.slice(0, 50),
      rising_subreddits: trendingData.rising.slice(0, 20),
      hot_subreddits: trendingData.hot.slice(0, 20),
      recommendations
    };

    console.log('✅ Reddit trending discovery completed');
    console.log(`📊 Results: ${trendingData.popular.length} popular, ${trendingData.rising.length} rising, ${trendingData.hot.length} hot`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Reddit trending discovery failed:', error);
    
    const errorResponse: TrendingDiscoveryResponse = {
      success: false,
      message: `Failed to discover trending subreddits: ${error.message}`,
      popular_subreddits: [],
      rising_subreddits: [],
      hot_subreddits: [],
      recommendations: [
        '❌ Failed to discover trending subreddits',
        `Error: ${error.message}`,
        '',
        '🔧 Troubleshooting:',
        '• Check Reddit API credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET)',
        '• Verify API rate limits',
        '• Ensure network connectivity'
      ]
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    )
  }
}) 
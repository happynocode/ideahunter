import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Industry mapping
const INDUSTRIES = {
  1: 'SaaS & Cloud',
  2: 'AI & Machine Learning', 
  3: 'Fintech',
  4: 'E-commerce',
  5: 'Healthcare Tech',
  6: 'EdTech',
  7: 'Developer Tools',
  8: 'Productivity',
  9: 'Social & Community',
  10: 'Gaming & Entertainment',
  11: 'Green Tech',
  12: 'IoT & Hardware',
  13: 'Cybersecurity'
};

interface RawRedditPost {
  id: number;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  permalink: string;
  reddit_id: string;
  industry_id: number;
  created_at: string;
}

interface StartupIdea {
  title: string;
  summary: string;
  industry_id: number;
  upvotes: number;
  comments: number;
  keywords: string[];
  subreddit: string;
  reddit_post_urls: string[];
  existing_solutions: string;
  solution_gaps: string;
  market_size: string;
  confidence_score: number;
  source_post_ids: number[];
}

async function callDeepSeekAPI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a startup analyst expert specializing in identifying market opportunities from Reddit discussions. Analyze posts and generate comprehensive startup ideas with deep market insights. IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or extra text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from DeepSeek API');
  }
  
  return data.choices[0].message.content;
}

function createAnalysisPrompt(industry: string, posts: RawRedditPost[]): string {
  const postsData = posts.map(post => ({
    id: post.id,
    title: post.title,
    content: post.content ? post.content.substring(0, 5000) : '',
    upvotes: post.upvotes,
    comments: post.comments,
    subreddit: post.subreddit,
    permalink: post.permalink
  }));

  return `
Analyze the following Reddit posts from the ${industry} industry and generate 3-5 high-potential startup ideas based on user pain points and unmet needs.

Reddit Discussion Data:
${JSON.stringify(postsData, null, 2)}

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "ideas": [
    {
      "title": "Clear, compelling startup idea title",
      "summary": "Comprehensive overview of the startup idea (3-4 sentences explaining the core problem and solution)",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "existing_solutions": "Analysis of current solutions in the market and their limitations",
      "solution_gaps": "Specific gaps and shortcomings in existing solutions that this startup would address",
      "market_size": "Market size estimation and target audience analysis",
      "confidence_score": 85,
      "source_post_ids": [1, 3, 5]
    }
  ]
}

Analysis Requirements:
1. Focus on real user pain points mentioned in the Reddit posts
2. Identify specific problems that lack adequate solutions
3. Provide realistic market sizing based on the discussion volume and engagement
4. Include confidence scores (1-100) based on market demand indicators
5. Reference specific Reddit posts that inspired each idea
6. Ensure each idea addresses genuine market needs
7. Consider the level of engagement (upvotes/comments) as demand signals
8. Keywords should be SEO-friendly and relevant to the startup idea
9. Existing solutions analysis should be thorough and factual
10. Solution gaps should identify specific opportunities for improvement

Sort ideas by market potential and confidence score (highest first).
Return JSON only, no other text.
`;
}



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧠 DeepSeek Analyzer function called!')
    console.log('🧠 Request method:', req.method)
    console.log('🧠 Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    
    // Always use SERVICE_ROLE_KEY for database operations in edge functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey })
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // JWT Verification: Allow both authenticated users and service role calls
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header')
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
    console.log('🔑 Token received (first 10 chars):', token.substring(0, 10) + '...')
    
    // Create supabase client - always use service role for database operations
    let supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Verify the token if it's not service role
    if (token !== serviceRoleKey && token !== Deno.env.get('SUPABASE_ANON_KEY')) {
      console.log('🔍 Verifying user JWT token...')
      try {
        const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
        const { data: { user }, error } = await anonClient.auth.getUser(token);
        if (error || !user) {
          console.error('❌ Invalid JWT token:', error)
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
        console.log('✅ JWT token verified for user:', user.id)
      } catch (error) {
        console.error('❌ JWT verification failed:', error)
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
    } else {
      console.log('🔑 Using service role or anon key authentication')
    }

    const body = await req.json().catch(() => ({}));
    const forceAnalyze = body.forceAnalyze || false;
    const timeRange = body.timeRange || '24h'; // '1h', '24h', '7d', '30d'
    const autoTriggered = body.autoTriggered || false;
    
    console.log(`🧠 DeepSeek Analyzer Starting - Request Body:`, JSON.stringify(body, null, 2));
    
    if (autoTriggered) {
      console.log(`🤖 Auto-triggered by reddit-scraper for ${timeRange} timeframe...`);
    } else {
      console.log(`🧠 Manually triggered DeepSeek analysis for ${timeRange} timeframe...`);
    }
    
    console.log(`🕐 Analysis timeframe: ${timeRange}, Force analyze: ${forceAnalyze}`);

    const results = [];
    const errors = [];
    let totalIdeasGenerated = 0;

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

    // Process each industry concurrently
    console.log(`🏭 Processing ${Object.keys(INDUSTRIES).length} industries: ${Object.values(INDUSTRIES).join(', ')}`);
    
    const industryPromises = Object.entries(INDUSTRIES).map(async ([industryId, industryName]) => {
      try {
        console.log(`🔍 Analyzing ${industryName} (ID: ${industryId}) industry for ${timeRange}...`);

        // Fetch recent posts for this industry based on timeRange
        const cutoffTime = getTimeRangeCutoff(timeRange);
        console.log(`📅 Cutoff time for ${industryName}: ${cutoffTime.toISOString()}`);

        const { data: posts, error: fetchError } = await supabaseClient
          .from('raw_reddit_posts')
          .select('*')
          .eq('industry_id', parseInt(industryId))
          .gte('created_at', cutoffTime.toISOString())
          .order('upvotes', { ascending: false });

        if (fetchError) {
          console.error(`❌ Database error for ${industryName}:`, fetchError);
          return { industry: industryName, error: fetchError.message, ideas: 0 };
        }

        console.log(`📊 Found ${posts?.length || 0} posts for ${industryName} in ${timeRange}`);

        if (!posts || posts.length < 5) {
          console.log(`⚠️ Insufficient data for ${industryName} (${posts?.length || 0} posts in ${timeRange}, need at least 5)`);
          return { industry: industryName, error: 'Insufficient data', ideas: 0 };
        }

        // Split posts into batches of 50 to avoid token limits
        const batchSize = 50;
        const postBatches: RawRedditPost[][] = [];
        for (let i = 0; i < posts.length; i += batchSize) {
          postBatches.push(posts.slice(i, i + batchSize));
        }
        
        if (postBatches.length === 0) {
          console.log(`No post batches found for ${industryName} in ${timeRange}`);
          return { industry: industryName, error: 'No post batches', ideas: 0 };
        }

        let industryIdeasCount = 0;

        // Analyze each batch of posts
        for (let i = 0; i < Math.min(postBatches.length, 5); i++) {
          const batchPosts = postBatches[i];
          
          // Generate analysis prompt with timeframe context
          const prompt = createAnalysisPromptWithTimeRange(industryName, batchPosts, timeRange);

          try {
            // Call DeepSeek API
            const analysisResponse = await callDeepSeekAPI(prompt);
            
            // Parse response and handle markdown code blocks
            let analysisData;
            try {
              let cleanResponse = analysisResponse.trim();
              if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
              } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
              
              analysisData = JSON.parse(cleanResponse);
            } catch (parseError) {
              console.error(`Failed to parse DeepSeek response for ${industryName}:`, parseError);
              console.error('Raw response:', analysisResponse.substring(0, 500));
              continue;
            }

            if (!analysisData.ideas || !Array.isArray(analysisData.ideas)) {
              console.error(`Invalid ideas format for ${industryName}`);
              continue;
            }

                          // Process and save ideas
              for (const ideaData of analysisData.ideas) {
                try {
                  // Calculate aggregate metrics from source posts
                  const sourcePosts = batchPosts.filter(post => 
                    !ideaData.source_post_ids || ideaData.source_post_ids.includes(post.id)
                  );
                
                const totalUpvotes = sourcePosts.reduce((sum, post) => sum + post.upvotes, 0);
                const totalComments = sourcePosts.reduce((sum, post) => sum + post.comments, 0);
                const redditPostUrls = sourcePosts.map(post => post.permalink);
                const sourcePostIds = sourcePosts.map(post => post.id);
                
                const startupIdea: StartupIdea = {
                  title: ideaData.title || 'Untitled Idea',
                  summary: ideaData.summary || 'No summary provided',
                  industry_id: parseInt(industryId),
                  upvotes: totalUpvotes,
                  comments: totalComments,
                  keywords: Array.isArray(ideaData.keywords) ? ideaData.keywords : [],
                  subreddit: sourcePosts.length > 0 ? sourcePosts[0].subreddit : 'unknown',
                  reddit_post_urls: redditPostUrls,
                  existing_solutions: ideaData.existing_solutions || '',
                  solution_gaps: ideaData.solution_gaps || '',
                  market_size: ideaData.market_size || '',
                  confidence_score: ideaData.confidence_score || 50,
                  source_post_ids: sourcePostIds
                };

                // Save to database
                const { error: insertError } = await supabaseClient
                  .from('startup_ideas')
                  .insert(startupIdea);

                if (insertError) {
                  console.error(`Failed to insert idea for ${industryName}:`, insertError);
                } else {
                  industryIdeasCount++;
                  totalIdeasGenerated++;
                  console.log(`Saved idea: ${startupIdea.title.substring(0, 50)}... (${timeRange})`);
                }
              } catch (ideaError) {
                console.error(`Error processing individual idea for ${industryName}:`, ideaError);
              }
            }
            
            // Rate limiting between API calls
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (apiError) {
            console.error(`DeepSeek API error for ${industryName}:`, apiError);
          }
        }

        return { industry: industryName, error: null, ideas: industryIdeasCount };

      } catch (error) {
        console.error(`Error analyzing ${industryName}:`, error);
        return { industry: industryName, error: error.message, ideas: 0 };
      }
    });

    // Wait for all industries to complete with controlled concurrency
    const industryResults = [];
    const concurrencyLimit = 3; // Limit concurrent API calls
    
    for (let i = 0; i < industryPromises.length; i += concurrencyLimit) {
      const batch = industryPromises.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(batch);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          industryResults.push(result.value);
        } else {
          const industryName = Object.values(INDUSTRIES)[i + index];
          industryResults.push({ 
            industry: industryName, 
            error: result.reason?.message || 'Unknown error', 
            ideas: 0 
          });
        }
      });
      
      // Delay between batches
      if (i + concurrencyLimit < industryPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    const { data: existingStats } = await supabaseClient
      .from('daily_stats')
      .select('*')
      .eq('date', today)
      .single();

    if (existingStats) {
      await supabaseClient
        .from('daily_stats')
        .update({
          totalIdeas: existingStats.totalIdeas + totalIdeasGenerated,
          updatedAt: new Date().toISOString()
        })
        .eq('id', existingStats.id);
    }

    console.log(`Analysis completed. Generated ${totalIdeasGenerated} startup ideas for ${timeRange}.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${totalIdeasGenerated} startup ideas across ${industryResults.length} industries (${timeRange})`,
        totalIdeasGenerated,
        timeRange,
        industriesProcessed: industryResults.length,
        results: industryResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('DeepSeek analysis failed:', error);
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

// Enhanced analysis prompt with time context
function createAnalysisPromptWithTimeRange(industry: string, posts: RawRedditPost[], timeRange: string): string {
  const postsData = posts.map(post => ({
    id: post.id,
    title: post.title,
    content: post.content ? post.content.substring(0, 5000) : '',
    upvotes: post.upvotes,
    comments: post.comments,
    subreddit: post.subreddit,
    permalink: post.permalink
  }));

  const timeContext = getTimeContextDescription(timeRange);

  return `
Analyze the following Reddit posts from the ${industry} industry from ${timeContext} and generate 3-10 high-potential startup ideas based on user pain points and unmet needs.

Reddit Discussion Data (${timeContext}):
${JSON.stringify(postsData, null, 2)}

Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "ideas": [
    {
      "title": "Clear, compelling startup idea title",
      "summary": "Comprehensive overview of the startup idea (3-4 sentences explaining the core problem and solution)",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "existing_solutions": "Analysis of current solutions in the market and their limitations",
      "solution_gaps": "Specific gaps and shortcomings in existing solutions that this startup would address",
      "market_size": "Market size estimation and target audience analysis",
      "confidence_score": 85,
      "source_post_ids": [1, 3, 5]
    }
  ]
}

Analysis Requirements:
1. Focus on ${timeContext} trends and emerging user pain points
2. Identify specific problems that lack adequate solutions
3. Consider the urgency and recency of the discussions (${timeContext})
4. Provide realistic market sizing based on the discussion volume and engagement
5. Include confidence scores (1-100) based on market demand indicators
6. Reference specific Reddit posts that inspired each idea
7. Ensure each idea addresses genuine market needs from ${timeContext}
8. Consider the level of engagement (upvotes/comments) as demand signals
9. Keywords should be SEO-friendly and relevant to the startup idea
10. Existing solutions analysis should be thorough and factual

Sort ideas by market potential and confidence score (highest first).
Return JSON only, no other text.
`;
}

function getTimeContextDescription(timeRange: string): string {
  switch (timeRange) {
    case '1h':
      return 'the last hour';
    case '24h':
    case '1d':
      return 'the last 24 hours';
    case '7d':
    case '1w':
      return 'the last week';
    case '30d':
    case '1m':
      return 'the last month';
    default:
      return 'the last 24 hours';
  }
}
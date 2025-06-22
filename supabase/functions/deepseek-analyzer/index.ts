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
  5: 'Healthcare',
  6: 'Education',
  7: 'Developer Tools',
  8: 'Productivity'
};

interface RawRedditPost {
  id: number;
  title: string;
  summary: string;
  industry_id: number;
  upvotes: number;
  comments: number;
  keywords: string[];
  subreddit: string;
  reddit_post_urls: string[];
  created_at: string;
}

interface StartupIdea {
  title: string;
  summary: string;
  market_opportunity: string;
  target_audience: string;
  competitive_analysis: string;
  implementation_roadmap: string;
  revenue_model: string;
  risk_assessment: string;
  confidence_score: number;
  source_posts: string[];
}

async function callDeepSeekAPI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
          content: 'You are a startup analyst expert. Analyze Reddit posts and generate comprehensive startup ideas with market insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function createAnalysisPrompt(industry: string, posts: RawRedditPost[]): string {
  const postsData = posts.map(post => ({
    title: post.title,
    summary: post.summary,
    upvotes: post.upvotes,
    comments: post.comments,
    keywords: post.keywords,
    subreddit: post.subreddit
  }));

  return `
请分析以下来自 Reddit 的 ${industry} 行业相关帖子，生成 5-7 个最有潜力的创业想法。

Reddit 数据：
${JSON.stringify(postsData, null, 2)}

请为每个创业想法提供以下信息（JSON 格式）：
{
  "ideas": [
    {
      "title": "创业想法标题",
      "summary": "简要概述（2-3句话）",
      "market_opportunity": "市场机会分析",
      "target_audience": "目标用户群体",
      "competitive_analysis": "竞争对手分析",
      "implementation_roadmap": "实施路线图",
      "revenue_model": "盈利模式",
      "risk_assessment": "风险评估",
      "confidence_score": 85,
      "source_posts": ["相关帖子标题1", "相关帖子标题2"]
    }
  ]
}

要求：
1. 基于真实的 Reddit 讨论数据
2. 确保每个想法都有明确的市场需求
3. 提供实用的商业洞察
4. 置信度评分（1-100）
5. 按照市场潜力排序
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Starting DeepSeek analysis process...');

    const results = [];
    const errors = [];

    // Get recent Reddit posts for each industry
    for (const [industryId, industryName] of Object.entries(INDUSTRIES)) {
      try {
        console.log(`Analyzing ${industryName} industry...`);

        // Fetch recent posts for this industry (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: posts, error: fetchError } = await supabaseClient
          .from('raw_reddit_posts')
          .select('*')
          .eq('industry_id', parseInt(industryId))
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('upvotes', { ascending: false })
          .limit(20);

        if (fetchError) {
          console.error(`Database error for ${industryName}:`, fetchError);
          continue;
        }

        if (!posts || posts.length < 3) {
          console.log(`Insufficient data for ${industryName} (${posts?.length || 0} posts)`);
          continue;
        }

        // Generate analysis prompt
        const prompt = createAnalysisPrompt(industryName, posts);

        // Call DeepSeek API
        const analysisResponse = await callDeepSeekAPI(prompt);
        
        // Parse response
        let analysisData;
        try {
          analysisData = JSON.parse(analysisResponse);
        } catch (parseError) {
          console.error(`Failed to parse DeepSeek response for ${industryName}:`, parseError);
          continue;
        }

        // Save startup ideas to database
        if (analysisData.ideas && Array.isArray(analysisData.ideas)) {
          for (const idea of analysisData.ideas) {
            const { error: insertError } = await supabaseClient
              .from('startup_ideas')
              .insert({
                title: idea.title,
                summary: idea.summary,
                industry_id: parseInt(industryId),
                upvotes: 0, // Will be populated later based on community feedback
                comments: 0,
                keywords: [], // Extract from idea content
                subreddit: 'analyzed', // Mark as AI-generated
                reddit_post_urls: [], // Reference to source posts
                existing_solutions: idea.competitive_analysis,
                solution_gaps: idea.market_opportunity,
                market_size: idea.revenue_model,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error(`Insert error for ${idea.title}:`, insertError);
            }
          }

          results.push({
            industry: industryName,
            ideas_generated: analysisData.ideas.length,
            sample_idea: analysisData.ideas[0]?.title
          });
        }

        // Rate limiting between API calls
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error analyzing ${industryName}:`, error);
        errors.push(`${industryName}: ${error.message}`);
      }
    }

    console.log(`Analysis completed. Processed ${results.length} industries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully analyzed ${results.length} industries and generated startup ideas`,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Analysis failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'DeepSeek analysis failed: ' + error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
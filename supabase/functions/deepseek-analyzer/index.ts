import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzerRequest {
  industry_ids: number[];     // 只分析指定行业  
  target_date: string;        // YYYY-MM-DD format
  task_ids: number[];         // 对应的task ID用于状态更新
  batch_id: string;           // 批次ID
}

interface AnalyzerResponse {
  success: boolean;
  message: string;
  totalIdeasGenerated: number;
  industriesProcessed: number;
  postsProcessed: number;
  taskResults: Array<{
    taskId: number;
    industryId: number;
    ideasGenerated: number;
    postsAnalyzed: number;
    postsSkipped: number;
    success: boolean;
    error?: string;
  }>;
}

// Industry mapping - simplified to match the task-based architecture
const INDUSTRY_MAPPING = {
  1: 'SaaS & 云服务',
  2: 'AI & 机器学习',
  3: '金融科技',
  4: '电商 & 零售',
  5: '健康 & 健身科技',
  6: '教育科技',
  7: '开发者工具 & 平台',
  8: '低/无代码平台',
  9: '社交 & 社区',
  10: '游戏 & 娱乐',
  11: '绿色 & 可持续科技',
  12: 'API & 后端服务',
  13: '网络安全 & 隐私',
  222: '移动应用开发',
  223: 'Web & 前端开发',
  224: '消费者服务',
  225: '企业服务 & B2B',
  226: '媒体 & 内容创作',
  227: '旅游 & 出行',
  228: '物流 & 供应链'
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
  priority_score?: number;
  processing_status?: string;
  quality_score?: number;
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
  target_date: string; // YYYY-MM-DD format
  confidence_score: number;
  source_post_ids: number[];
  quality_score: number;
  innovation_score: number;
}

// 计算帖子优先级分数（多因素评分）
function calculatePriorityScore(post: RawRedditPost): number {
  const upvoteWeight = 0.4;
  const commentWeight = 0.3;
  const timeWeight = 0.2;
  const contentWeight = 0.1;
  
  // 标准化分数 (0-100)
  const upvoteScore = Math.min(post.upvotes, 1000) / 10; // 最高100分
  const commentScore = Math.min(post.comments, 500) / 5; // 最高100分
  
  // 时间分数：越新越高
  const postTime = new Date(post.created_at).getTime();
  const now = new Date().getTime();
  const hoursDiff = (now - postTime) / (1000 * 60 * 60);
  const timeScore = Math.max(0, 100 - hoursDiff); // 1小时内100分，逐渐递减
  
  // 内容质量分数：根据标题和内容长度
  const titleLength = post.title?.length || 0;
  const contentLength = post.content?.length || 0;
  const contentScore = Math.min((titleLength + contentLength / 10) / 5, 100);
  
  const finalScore = 
    upvoteScore * upvoteWeight +
    commentScore * commentWeight +
    timeScore * timeWeight +
    contentScore * contentWeight;
    
  return Math.round(finalScore);
}

// 计算想法质量分数
function calculateIdeaQualityScore(idea: any, sourcePost: RawRedditPost): number {
  const confidenceWeight = 0.4;
  const socialWeight = 0.3;
  const innovationWeight = 0.3;
  
  const confidenceScore = idea.confidence_score || 50;
  
  // 社区热度分数
  const socialScore = Math.min((sourcePost.upvotes + sourcePost.comments * 2) / 10, 100);
  
  // 创新度分数（基于关键词多样性和解决方案复杂度）
  const keywordDiversity = (idea.keywords?.length || 0) * 10;
  const solutionComplexity = (idea.solution_gaps?.length || 0) / 10;
  const innovationScore = Math.min(keywordDiversity + solutionComplexity, 100);
  
  const qualityScore = 
    confidenceScore * confidenceWeight +
    socialScore * socialWeight +
    innovationScore * innovationWeight;
    
  return Math.round(qualityScore);
}

// 去重机制：检查相似想法
function calculateSimilarity(idea1: any, idea2: any): number {
  const title1 = idea1.title?.toLowerCase() || '';
  const title2 = idea2.title?.toLowerCase() || '';
  
  const keywords1 = new Set(idea1.keywords?.map((k: string) => k.toLowerCase()) || []);
  const keywords2 = new Set(idea2.keywords?.map((k: string) => k.toLowerCase()) || []);
  
  // 标题相似度
  const titleWords1 = new Set(title1.split(/\s+/));
  const titleWords2 = new Set(title2.split(/\s+/));
  const titleIntersection = new Set([...titleWords1].filter(x => titleWords2.has(x)));
  const titleSimilarity = titleIntersection.size / Math.max(titleWords1.size, titleWords2.size);
  
  // 关键词相似度
  const keywordIntersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const keywordSimilarity = keywordIntersection.size / Math.max(keywords1.size, keywords2.size);
  
  // 综合相似度
  return (titleSimilarity * 0.6 + keywordSimilarity * 0.4);
}

// Gemini免费模型列表（按照优先级排列）
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

let currentModelIndex = 0;

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  let lastError: string = '';
  
  // 轮换所有可用的模型
  for (let attempt = 0; attempt < GEMINI_MODELS.length; attempt++) {
    const modelIndex = (currentModelIndex + attempt) % GEMINI_MODELS.length;
    const model = GEMINI_MODELS[modelIndex];
    
    try {
      console.log(`Trying Gemini model: ${model} (attempt ${attempt + 1}/${GEMINI_MODELS.length})`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a startup analyst expert specializing in identifying market opportunities from Reddit discussions. Analyze posts and generate comprehensive startup ideas with deep market insights. IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or extra text.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            topP: 0.95,
            topK: 40
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error(`Invalid response format from Gemini API (${model})`);
        }
        
        const content = data.candidates[0].content.parts[0]?.text;
        if (!content) {
          throw new Error(`No content in response from Gemini API (${model})`);
        }
        
        // 更新当前模型索引为下一个（轮换使用）
        currentModelIndex = (modelIndex + 1) % GEMINI_MODELS.length;
        console.log(`✅ Successfully used Gemini model: ${model}`);
        
        return content;
      } else {
        const errorText = await response.text();
        lastError = `Gemini API error with ${model}: ${response.status} - ${errorText}`;
        console.error(lastError);
        
        // 如果是rate limit错误，等待一段时间后继续尝试下一个模型
        if (response.status === 429) {
          console.log(`Rate limit hit for ${model}, trying next model...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      lastError = `Error calling Gemini API with ${model}: ${error.message}`;
      console.error(lastError);
    }
  }
  
  // 如果所有模型都失败了，抛出最后一个错误
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

function createAnalysisPrompt(industry: string, posts: RawRedditPost[], targetDate: string): string {
  const postsData = posts.map(post => ({
    id: post.id,
    title: post.title,
    content: post.content ? post.content.substring(0, 3000) : '',
    upvotes: post.upvotes,
    comments: post.comments,
    subreddit: post.subreddit,
    permalink: post.permalink,
    priority_score: post.priority_score
  }));

  // Calculate 5-day range for context
  const targetDateObj = new Date(targetDate);
  const startDate = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate() - 4);
  const startDateStr = startDate.toISOString().split('T')[0];
  const dateContext = `from ${startDateStr} to ${targetDate} (5-day range)`;

  return `
Analyze the following high-priority Reddit posts from the ${industry} industry from ${dateContext} and generate 0-10 high-potential startup ideas based on user pain points and unmet needs.

**IMPORTANT: Only generate ideas if you find genuine, valuable opportunities. It's perfectly acceptable to return an empty ideas array if:**
- The posts don't reveal significant unmet needs
- The sample size is too small to identify clear patterns
- The discussions are too generic or lack actionable insights
- Existing solutions already adequately address the problems mentioned
- The market opportunity appears insufficient

Quality over quantity - only suggest ideas you have high confidence in.

Reddit Discussion Data (${dateContext}, sorted by priority):
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
      "innovation_score": 75,
      "source_post_ids": [1, 3, 5]
    }
  ],
  "analysis_notes": "Brief explanation of why you generated these ideas, or why you chose not to generate any ideas if the array is empty"
}

Analysis Requirements:
1. Focus on ${dateContext} trends and emerging user pain points
2. **ONLY identify problems that lack adequate solutions and show clear market demand**
3. Consider the urgency and recency of the discussions over this 5-day period
4. **Require at least 3-5 related posts discussing similar problems before considering an idea**
5. Include confidence scores (1-100) - only suggest ideas with confidence ≥70
6. Include innovation scores (1-100) based on solution uniqueness
7. Reference specific Reddit posts that inspired each idea
8. **If the posts don't reveal clear patterns or significant opportunities, return an empty ideas array**
9. Consider the priority scores when evaluating market potential
10. Keywords should be SEO-friendly and relevant to the startup idea
11. **Reject ideas that have obvious, well-established solutions already available**
12. **Require genuine user frustration or pain points, not just feature requests**

**Remember: It's better to return no ideas than to force weak or unconvincing ones. Be selective and critical.**

Sort ideas by combined market potential, confidence score, and innovation score (highest first).
Return JSON only, no other text.
`;
}

// 这些函数已经不再需要，因为我们现在使用具体的目标日期而不是时间范围

// Update task status and statistics
async function updateTaskStatus(
  supabaseClient: any,
  taskId: number,
  status: string,
  updates: { ideas_generated?: number; error_message?: string; posts_processed?: number } = {}
): Promise<void> {
  const updateData: any = { status };
  
  if (status === 'complete_analysis') {
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

// 管理每个行业的最高质量想法（最多保留5个）
async function manageTopIdeasForIndustry(
  supabaseClient: any,
  industryId: number,
  newIdeas: StartupIdea[],
  targetDate: string
): Promise<number> {
  let savedCount = 0;

  // 定义扩展的想法类型
  type ExtendedIdea = StartupIdea & { id?: number };

  // 去重：移除新想法中相似的想法
  const uniqueNewIdeas: ExtendedIdea[] = [];
  for (const idea of newIdeas) {
    let isDuplicate = false;
    for (const existingIdea of uniqueNewIdeas) {
      if (calculateSimilarity(idea, existingIdea) > 0.7) { // 70%相似度阈值
        // 保留质量分数更高的
        if (idea.quality_score > existingIdea.quality_score) {
          const index = uniqueNewIdeas.indexOf(existingIdea);
          uniqueNewIdeas[index] = idea;
        }
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      uniqueNewIdeas.push(idea);
    }
  }

  // 检查与现有想法的相似性，避免重复
  const { data: existingIdeas, error: fetchError } = await supabaseClient
    .from('startup_ideas')
    .select('*')
    .eq('industry_id', industryId)
    .eq('target_date', targetDate)
    .order('quality_score', { ascending: false });

  if (fetchError) {
    console.error(`Error fetching existing ideas for industry ${industryId} on ${targetDate}:`, fetchError);
  }

  const finalNewIdeas: ExtendedIdea[] = [];
  for (const newIdea of uniqueNewIdeas) {
    let isDuplicate = false;
    for (const existingIdea of (existingIdeas || [])) {
      if (calculateSimilarity(newIdea, existingIdea) > 0.7) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      finalNewIdeas.push(newIdea);
    }
  }

  // 按质量分数排序，保留前5个新想法
  finalNewIdeas.sort((a, b) => b.quality_score - a.quality_score);
  const topNewIdeas = finalNewIdeas.slice(0, 5);

  console.log(`💡 Adding ${topNewIdeas.length} new unique ideas for industry ${industryId} on ${targetDate}`);

  // 插入新的想法
  for (const idea of topNewIdeas) {
    const { error: insertError } = await supabaseClient
      .from('startup_ideas')
      .insert(idea);

    if (insertError) {
      console.error(`Error inserting idea for industry ${industryId} on ${targetDate}:`, insertError);
    } else {
      savedCount++;
    }
  }

  // 检查该行业在该日期是否有超过5个想法，如果有则删除质量较低的
  const { data: allIdeasForDate, error: countError } = await supabaseClient
    .from('startup_ideas')
    .select('*')
    .eq('industry_id', industryId)
    .eq('target_date', targetDate)
    .order('quality_score', { ascending: false });

  if (!countError && allIdeasForDate && allIdeasForDate.length > 5) {
    const idsToDelete = allIdeasForDate.slice(5).map(idea => idea.id);
    const { error: deleteError } = await supabaseClient
      .from('startup_ideas')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error(`Error deleting excess ideas for industry ${industryId} on ${targetDate}:`, deleteError);
    } else {
      console.log(`🗑️ Deleted ${idsToDelete.length} excess ideas for industry ${industryId} on ${targetDate}`);
    }
  }

  return savedCount;
}

// Process industry analysis with improved logic
async function analyzeIndustry(
  supabaseClient: any,
  industryId: number,
  industryName: string,
  targetDate: string
): Promise<{ ideasGenerated: number; postsAnalyzed: number; postsSkipped: number; error?: string }> {
  try {
    console.log(`🔍 Analyzing ${industryName} (ID: ${industryId}) industry for 5-day range ending ${targetDate}...`);

    // 获取未处理的帖子，按5天日期范围过滤
    const targetDateObj = new Date(targetDate + 'T00:00:00.000Z');
    // Start from 5 days ago (targetDate - 4 days) at 00:00:00
    const targetDateStart = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate() - 4, 0, 0, 0);
    // End at target date at 23:59:59
    const targetDateEnd = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), 23, 59, 59);
    
    const startDateStr = targetDateStart.toISOString().split('T')[0];
    const endDateStr = targetDateEnd.toISOString().split('T')[0];
    console.log(`📅 Target 5-day range for ${industryName}: ${startDateStr} to ${endDateStr}`);

    const { data: allPosts, error: fetchError } = await supabaseClient
      .from('raw_reddit_posts')
      .select('*')
      .eq('industry_id', industryId)
      .eq('analyzed', false)  // 只处理未分析过的posts
      .gte('created_at', targetDateStart.toISOString())
      .lte('created_at', targetDateEnd.toISOString())
      .order('priority_score', { ascending: false })
      .order('upvotes', { ascending: false })
      .order('comments', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    console.log(`📊 Found ${allPosts?.length || 0} unprocessed posts for ${industryName} on ${targetDate}`);

    if (!allPosts || allPosts.length === 0) {
      console.log(`⚠️ No unprocessed posts found for ${industryName}`);
      return { ideasGenerated: 0, postsAnalyzed: 0, postsSkipped: 0, error: 'No unprocessed posts available for analysis' };
    }

    // 为所有帖子计算优先级分数（如果还没有或为0）
    const postsWithPriority = allPosts.map(post => {
      if (!post.priority_score || post.priority_score === 0) {
        post.priority_score = calculatePriorityScore(post);
      }
      return post;
    });

    // 更新所有帖子的优先级分数
    for (const post of postsWithPriority) {
      if (post.priority_score !== allPosts.find(p => p.id === post.id)?.priority_score) {
        const { error: updateError } = await supabaseClient
          .from('raw_reddit_posts')
          .update({ priority_score: post.priority_score })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Error updating priority score for post ${post.id}:`, updateError);
        }
      }
    }

    // 按优先级重新排序
    postsWithPriority.sort((a, b) => {
      if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      if (b.comments !== a.comments) return b.comments - a.comments;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 限制处理200个帖子
    const postsToAnalyze = postsWithPriority.slice(0, 200);
    const postsToSkip = postsWithPriority.slice(200);

    console.log(`📝 Will analyze ${postsToAnalyze.length} posts, skip ${postsToSkip.length} posts for ${industryName}`);

    // 标记跳过的帖子
    if (postsToSkip.length > 0) {
      const skipPostIds = postsToSkip.map(post => post.id);
      const { error: skipError } = await supabaseClient
        .from('raw_reddit_posts')
        .update({ 
          processing_status: 'skipped_low_priority',
          analyzed: true,
          analyzed_at: new Date().toISOString()
        })
        .in('id', skipPostIds);

      if (skipError) {
        console.error(`Error marking posts as skipped for ${industryName}:`, skipError);
      } else {
        console.log(`✅ Marked ${skipPostIds.length} posts as skipped for ${industryName}`);
      }
    }

    if (postsToAnalyze.length === 0) {
      console.log(`⚠️ No posts to analyze for ${industryName}`);
      return { 
        ideasGenerated: 0, 
        postsAnalyzed: 0, 
        postsSkipped: postsToSkip.length, 
        error: 'No posts to analyze' 
      };
    }

    // 分批处理帖子以避免token限制
    const batchSize = 30; // 减少批次大小以提高质量
    const postBatches: RawRedditPost[][] = [];
    for (let i = 0; i < postsToAnalyze.length; i += batchSize) {
      postBatches.push(postsToAnalyze.slice(i, i + batchSize));
    }

    const allNewIdeas: StartupIdea[] = [];
    let postsAnalyzedCount = 0;

    // 分析每批帖子
    for (let i = 0; i < postBatches.length; i++) {
      const batchPosts = postBatches[i];
      
      try {
        console.log(`📝 Analyzing batch ${i + 1}/${postBatches.length} for ${industryName} (${batchPosts.length} posts)...`);
        
        const prompt = createAnalysisPrompt(industryName, batchPosts, targetDate);
        const analysisResponse = await callGeminiAPI(prompt);
        
        // 解析响应
        let analysisData;
        try {
          let cleanResponse = analysisResponse.trim();
          
          // 清理markdown代码块
          if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          // 清理JSON字符串中的问题字符
          cleanResponse = cleanResponse.replace(/"\$([0-9.]+[BMK]?)\s+([^"]*?)"/g, '"$$$1 $2"');
          cleanResponse = cleanResponse.replace(/([^\\])\$([0-9.]+[BMK]?)\s+/g, '$1$$$2 ');
          
          // 修复由于截断导致的不完整JSON
          if (!cleanResponse.endsWith('}') && !cleanResponse.endsWith(']}')) {
            const lastBraceIndex = cleanResponse.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              cleanResponse = cleanResponse.substring(0, lastBraceIndex + 1) + ']}';
            }
          }
          
          analysisData = JSON.parse(cleanResponse);
        } catch (parseError) {
          console.error(`Failed to parse Gemini response for ${industryName}:`, parseError);
          console.error('Raw response:', analysisResponse.substring(0, 1000));
          continue;
        }

        if (!analysisData.ideas || !Array.isArray(analysisData.ideas)) {
          console.error(`Invalid ideas format for ${industryName}`);
          continue;
        }

        // 检查是否没有生成想法，这是正常情况
        if (analysisData.ideas.length === 0) {
          const analysisNotes = analysisData.analysis_notes || 'No specific reason provided';
          console.log(`📝 ${industryName} - No ideas generated: ${analysisNotes}`);
          // 这不是错误，继续处理下一批
          continue;
        }

        console.log(`💡 ${industryName} - Generated ${analysisData.ideas.length} ideas`);

        // 处理想法
        for (const ideaData of analysisData.ideas) {
          try {
            // 找到源帖子
            const sourcePosts = batchPosts.filter(post => 
              !ideaData.source_post_ids || ideaData.source_post_ids.includes(post.id)
            );
            
            if (sourcePosts.length === 0) continue;

            const primaryPost = sourcePosts[0];
            const totalUpvotes = sourcePosts.reduce((sum, post) => sum + post.upvotes, 0);
            const totalComments = sourcePosts.reduce((sum, post) => sum + post.comments, 0);
            const redditPostUrls = sourcePosts.map(post => post.permalink);
            const sourcePostIds = sourcePosts.map(post => post.id);
            
            // 计算想法质量分数
            const qualityScore = calculateIdeaQualityScore(ideaData, primaryPost);
            
            const startupIdea: StartupIdea = {
              title: ideaData.title || 'Untitled Idea',
              summary: ideaData.summary || 'No summary provided',
              industry_id: industryId,
              upvotes: totalUpvotes,
              comments: totalComments,
              keywords: Array.isArray(ideaData.keywords) ? ideaData.keywords : [],
              subreddit: primaryPost.subreddit,
              reddit_post_urls: redditPostUrls,
              existing_solutions: ideaData.existing_solutions || '',
              solution_gaps: ideaData.solution_gaps || '',
              market_size: ideaData.market_size || '',
              target_date: targetDate,
              confidence_score: ideaData.confidence_score || 50,
              source_post_ids: sourcePostIds,
              quality_score: qualityScore,
              innovation_score: ideaData.innovation_score || 50
            };

            allNewIdeas.push(startupIdea);
            console.log(`✅ Generated idea: ${startupIdea.title.substring(0, 50)}... (Quality: ${qualityScore})`);
          } catch (ideaError) {
            console.error(`Error processing individual idea for ${industryName}:`, ideaError);
          }
        }
        
        // 标记已分析的帖子
        const postIds = batchPosts.map(post => post.id);
        const { error: updateError } = await supabaseClient
          .from('raw_reddit_posts')
          .update({ 
            processing_status: 'analyzed',
            analyzed: true, 
            analyzed_at: new Date().toISOString() 
          })
          .in('id', postIds);
        
        if (updateError) {
          console.error(`Failed to mark posts as analyzed for ${industryName}:`, updateError);
        } else {
          postsAnalyzedCount += postIds.length;
          console.log(`✅ Marked ${postIds.length} posts as analyzed for ${industryName}`);
        }
        
        // API调用之间的延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (apiError) {
        console.error(`Gemini API error for ${industryName} batch ${i + 1}:`, apiError);
        
        // 标记失败的帖子
        const postIds = batchPosts.map(post => post.id);
        await supabaseClient
          .from('raw_reddit_posts')
          .update({ 
            processing_status: 'skipped_api_error',
            analyzed: true,
            analyzed_at: new Date().toISOString()
          })
          .in('id', postIds);
      }
    }

    // 管理该行业的顶级想法（最多保留5个最高质量的）
    const savedIdeasCount = await manageTopIdeasForIndustry(supabaseClient, industryId, allNewIdeas, targetDate);

    console.log(`🎯 ${industryName} analysis complete: ${savedIdeasCount} top ideas saved, ${postsAnalyzedCount} posts analyzed, ${postsToSkip.length} posts skipped`);

    return { 
      ideasGenerated: savedIdeasCount,
      postsAnalyzed: postsAnalyzedCount,
      postsSkipped: postsToSkip.length
    };

  } catch (error) {
    console.error(`Error analyzing ${industryName}:`, error);
    return { 
      ideasGenerated: 0, 
      postsAnalyzed: 0, 
      postsSkipped: 0, 
      error: error.message 
    };
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
    }: AnalyzerRequest = await req.json();
    
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
    
    console.log(`🧠 Starting enhanced Gemini analysis for industries: ${industry_ids.join(', ')}, target date: ${target_date}, batch: ${batch_id}`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalIdeasGenerated = 0;
    let totalPostsProcessed = 0;
    const taskResults: Array<{
      taskId: number;
      industryId: number;
      ideasGenerated: number;
      postsAnalyzed: number;
      postsSkipped: number;
      success: boolean;
      error?: string;
    }> = [];

    // Process industry tasks concurrently
    console.log(`🚀 Starting concurrent processing of ${industry_ids.length} industries...`);
    
    const industryTasks = industry_ids.map(async (industryId, i) => {
      const taskId = task_ids[i];
      const industryName = INDUSTRY_MAPPING[industryId] || `Industry ${industryId}`;
      
      try {
        console.log(`🏭 Processing industry ${industryId} (${industryName}) for task ${taskId}...`);
        
        const { ideasGenerated, postsAnalyzed, postsSkipped, error } = await analyzeIndustry(
          supabaseClient,
          industryId,
          industryName,
          target_date
        );
        
        const postsProcessed = postsAnalyzed + postsSkipped;
        
        if (error && ideasGenerated === 0) {
          // Check if this is a "no posts" error which should not be retried
          const isNoPostsError = error.includes('No unprocessed posts available for analysis');
          
          // Update task status to failed
          await updateTaskStatus(supabaseClient, taskId, isNoPostsError ? 'complete_analysis' : 'failed', {
            error_message: isNoPostsError ? undefined : error,
            posts_processed: postsProcessed,
            ideas_generated: 0
          });
          
          return {
            taskId,
            industryId,
            ideasGenerated: 0,
            postsAnalyzed,
            postsSkipped,
            postsProcessed,
            success: isNoPostsError, // Consider "no posts" as success to avoid retries
            error: isNoPostsError ? undefined : error
          };
        } else {
          // Update task status to complete_analysis
          await updateTaskStatus(supabaseClient, taskId, 'complete_analysis', {
            ideas_generated: ideasGenerated,
            posts_processed: postsProcessed
          });
          
          return {
            taskId,
            industryId,
            ideasGenerated,
            postsAnalyzed,
            postsSkipped,
            postsProcessed,
            success: true
          };
        }
        
      } catch (error) {
        console.error(`❌ Error processing industry ${industryId}:`, error);
        
        // Update task status to failed
        await updateTaskStatus(supabaseClient, taskId, 'failed', {
          error_message: error.message
        });
        
        return {
          taskId,
          industryId,
          ideasGenerated: 0,
          postsAnalyzed: 0,
          postsSkipped: 0,
          postsProcessed: 0,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for all industry analyses to complete
    const results = await Promise.all(industryTasks);
    
    // Aggregate results
    for (const result of results) {
      totalIdeasGenerated += result.ideasGenerated;
      totalPostsProcessed += result.postsProcessed;
      
      taskResults.push({
        taskId: result.taskId,
        industryId: result.industryId,
        ideasGenerated: result.ideasGenerated,
        postsAnalyzed: result.postsAnalyzed,
        postsSkipped: result.postsSkipped,
        success: result.success,
        error: result.error
      });
      
      console.log(`✅ Industry ${result.industryId} completed: ${result.ideasGenerated} ideas generated, ${result.postsProcessed} posts processed`);
    }

    console.log(`🎉 Enhanced Gemini analysis completed! Total ideas: ${totalIdeasGenerated}, Posts processed: ${totalPostsProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${totalIdeasGenerated} ideas for ${industry_ids.length} industries with ${totalPostsProcessed} posts processed`,
        totalIdeasGenerated,
        industriesProcessed: industry_ids.length,
        postsProcessed: totalPostsProcessed,
        taskResults
      } as AnalyzerResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Enhanced Gemini analysis failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Enhanced Gemini analysis failed',
        error: error.message,
        totalIdeasGenerated: 0,
        industriesProcessed: 0,
        postsProcessed: 0,
        taskResults: []
      } as AnalyzerResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzerTask {
  id: number;
  industry_id: number;
  target_date: string;
  batch_id: string;
  retry_count: number;
  max_retries: number;
}

const BATCH_SIZE = 4; // 每次处理4个任务
const LOCK_TIMEOUT = 300000; // 5分钟锁定超时
const TASK_TIMEOUT = 600000; // 10分钟任务超时

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 生成唯一锁ID
  const lockId = `analyzer_coordinator_${Date.now()}_${crypto.randomUUID()}`;
  
  try {
    console.log('Analyzer Coordinator: Starting task processing...')

    // 1. 实现真正的分布式锁：在scrape_tasks表中创建锁记录
    const lockExpiry = new Date(Date.now() + LOCK_TIMEOUT).toISOString();
    
    // 尝试获取锁 - 插入锁记录
    const { error: lockError } = await supabaseClient
      .from('scrape_tasks')
      .insert({
        industry_id: -2, // 特殊标识：analyzer锁记录
        target_date: 'lock',
        status: 'analyzer_lock',
        batch_id: lockId,
        created_at: lockExpiry, // 使用created_at作为过期时间
        error_message: 'Analyzer coordinator distributed lock'
      });

    // 如果插入失败，检查是否有其他活跃的锁
    if (lockError) {
      // 检查是否有未过期的锁
      const { data: existingLocks } = await supabaseClient
        .from('scrape_tasks')
        .select('id')
        .eq('status', 'analyzer_lock')
        .eq('industry_id', -2)
        .gte('created_at', new Date().toISOString())
        .limit(1);

      if (existingLocks && existingLocks.length > 0) {
        console.log('Analyzer Coordinator: Another instance is already running, skipping...')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Another analyzer coordinator instance is running',
            tasksProcessed: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. 清理过期的锁记录
    await supabaseClient
      .from('scrape_tasks')
      .delete()
      .eq('status', 'analyzer_lock')
      .eq('industry_id', -2)
      .lt('created_at', new Date().toISOString());

    // 3. 检查并重置超时任务
    console.log('Analyzer Coordinator: Checking for timeout tasks...');
    const { data: timeoutTasks } = await supabaseClient
      .from('scrape_tasks')
      .select('id, retry_count, max_retries')
      .eq('status', 'analyzing')
      .lt('started_at', new Date(Date.now() - TASK_TIMEOUT).toISOString());

    if (timeoutTasks && timeoutTasks.length > 0) {
      console.log(`Analyzer Coordinator: Found ${timeoutTasks.length} timeout tasks, resetting...`);
      
      // 重置未超过最大重试次数的超时任务
      const retryableTimeoutTasks = timeoutTasks.filter(task => task.retry_count < task.max_retries);
      const failedTimeoutTasks = timeoutTasks.filter(task => task.retry_count >= task.max_retries);
      
      if (retryableTimeoutTasks.length > 0) {
        for (const task of retryableTimeoutTasks) {
          await supabaseClient
            .from('scrape_tasks')
            .update({
              status: 'complete_scrape',
              retry_count: task.retry_count + 1,
              error_message: 'Analysis timeout, retrying...',
              started_at: null
            })
            .eq('id', task.id);
        }
      }
      
      if (failedTimeoutTasks.length > 0) {
        await supabaseClient
          .from('scrape_tasks')
          .update({
            status: 'failed',
            error_message: 'Analysis timeout, max retries exceeded',
            completed_at: new Date().toISOString()
          })
          .in('id', failedTimeoutTasks.map(t => t.id));
      }
    }

    // 4. 检查并重试失败的分析任务（1小时后重试）
    console.log('Analyzer Coordinator: Checking for retryable failed analysis tasks...');
    const { data: retryTasks } = await supabaseClient
      .from('scrape_tasks')
      .select('*')
      .eq('status', 'failed')
      .not('error_message', 'ilike', '%No unprocessed posts%') // 排除没有帖子的情况
      .not('error_message', 'ilike', '%no posts%') // 排除没有帖子的情况（小写）
              .or('error_message.ilike.%analysis%,error_message.ilike.%gemini%,error_message.ilike.%API%,error_message.ilike.%timeout%')
      .filter('retry_count', 'lt', 'max_retries')
      .lt('completed_at', new Date(Date.now() - 3600000).toISOString()); // 1小时后重试

    if (retryTasks && retryTasks.length > 0) {
      console.log(`Analyzer Coordinator: Found ${retryTasks.length} retryable failed analysis tasks`);
      for (const task of retryTasks) {
        await supabaseClient
          .from('scrape_tasks')
          .update({
            status: 'complete_scrape',
            retry_count: task.retry_count + 1,
            error_message: null,
            started_at: null,
            completed_at: null
          })
          .eq('id', task.id);
      }
    }

    // 5. 检查正在运行的分析任务数量
    console.log('Analyzer Coordinator: Checking for running analysis tasks...');
    const { data: runningTasks, error: runningError } = await supabaseClient
      .from('scrape_tasks')
      .select('id')
      .eq('status', 'analyzing')
      .gt('industry_id', 0); // 排除锁记录

    if (runningError) {
      throw new Error(`Failed to check running analysis tasks: ${runningError.message}`);
    }

    const runningTaskCount = runningTasks?.length || 0;
    console.log(`Analyzer Coordinator: Found ${runningTaskCount} running analysis tasks`);

    // 如果已经有4个或更多任务在运行，不处理新任务
    if (runningTaskCount >= 4) {
      console.log('Analyzer Coordinator: Maximum concurrent analysis tasks reached, skipping new task processing')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Maximum concurrent analysis tasks reached (${runningTaskCount}/4), skipping new task processing`,
          tasksProcessed: 0,
          runningAnalysisTasks: runningTaskCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 获取完成爬取的任务，根据剩余容量限制
    const availableSlots = 4 - runningTaskCount;
    const taskLimit = Math.min(BATCH_SIZE, availableSlots);
    
    console.log(`Analyzer Coordinator: Available analysis slots: ${availableSlots}, will process up to ${taskLimit} tasks`);
    
    const { data: completeTasks, error: fetchError } = await supabaseClient
      .from('scrape_tasks')
      .select(`
        id,
        industry_id,
        target_date,
        batch_id,
        retry_count,
        max_retries
      `)
      .eq('status', 'complete_scrape')
      .gt('industry_id', 0) // 排除锁记录
      .order('completed_at', { ascending: true })
      .limit(taskLimit);

    if (fetchError) {
      throw new Error(`Failed to fetch complete scrape tasks: ${fetchError.message}`);
    }

    if (!completeTasks || completeTasks.length === 0) {
      console.log('Analyzer Coordinator: No complete scrape tasks found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No complete scrape tasks to analyze',
          tasksProcessed: 0,
          runningAnalysisTasks: runningTaskCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzer Coordinator: Found ${completeTasks.length} complete scrape tasks, will process with ${runningTaskCount} already analyzing`);

    // 7. 使用事务更新任务状态为 'analyzing'
    const taskIds = completeTasks.map(task => task.id);
    const { error: updateError } = await supabaseClient
      .from('scrape_tasks')
      .update({
        status: 'analyzing',
        started_at: new Date().toISOString()
      })
      .in('id', taskIds)
      .eq('status', 'complete_scrape'); // 添加状态检查防止竞争条件

    if (updateError) {
      throw new Error(`Failed to update task status to analyzing: ${updateError.message}`);
    }

    // 8. 准备调用 gemini-analyzer 的参数
    const industryIds = completeTasks.map(task => task.industry_id);
    const batchIds = [...new Set(completeTasks.map(task => task.batch_id))];
    const targetDate = completeTasks[0].target_date;

    const analyzerPayload = {
      industry_ids: industryIds,
      target_date: targetDate,
      task_ids: taskIds,
      batch_id: batchIds[0]
    };

    console.log('Analyzer Coordinator: Calling gemini-analyzer with payload:', {
      ...analyzerPayload,
      industry_ids: analyzerPayload.industry_ids.length + ' industries',
      task_ids: analyzerPayload.task_ids.length + ' tasks'
    });

    // 9. 触发 gemini-analyzer 函数 (fire-and-forget)
    console.log('Analyzer Coordinator: Triggering gemini-analyzer...');
    
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/deepseek-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyzerPayload)
    }).then(response => {
      if (response.ok) {
        console.log('Analyzer Coordinator: Successfully triggered gemini-analyzer');
      } else {
        console.error(`Analyzer Coordinator: Failed to trigger gemini-analyzer: ${response.status}`);
      }
    }).catch(error => {
      console.error('Analyzer Coordinator: Error triggering gemini-analyzer:', error);
    });
    
    console.log('Analyzer Coordinator: Gemini analyzer triggered, tasks handed off');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully triggered ${completeTasks.length} analysis tasks`,
        tasksProcessed: completeTasks.length,
        timeoutTasksReset: timeoutTasks?.length || 0,
        failedTasksRetried: retryTasks?.length || 0,
        runningAnalysisTasksBefore: runningTaskCount,
        totalAnalysisRunningAfter: runningTaskCount + completeTasks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analyzer Coordinator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Analyzer coordinator failed',
        error: error.message,
        tasksProcessed: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  } finally {
    // 10. 释放锁 - 删除锁记录
    try {
      await supabaseClient
        .from('scrape_tasks')
        .delete()
        .eq('batch_id', lockId)
        .eq('status', 'analyzer_lock');
    } catch (error) {
      console.error('Failed to release analyzer lock:', error);
    }
  }
}) 
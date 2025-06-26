
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScraperTask {
  id: number;
  industry_id: number;
  target_date: string;
  batch_id: string;
  retry_count: number;
  max_retries: number;
}

const BATCH_SIZE = 2; // 每次处理2个任务（优化后）
const LOCK_TIMEOUT = 300000; // 5分钟锁定超时
const TASK_TIMEOUT = 300000; // 5分钟任务超时 (优化后缩短，原来是10分钟)
const MAX_TASK_RETRIES = 3; // 最大重试次数

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 生成唯一锁ID
  const lockId = `scraper_coordinator_${Date.now()}_${crypto.randomUUID()}`;
  
  try {
    console.log('Scraper Coordinator: Starting task processing...')

    // 1. 实现真正的分布式锁：在scrape_tasks表中创建锁记录
    const lockExpiry = new Date(Date.now() + LOCK_TIMEOUT).toISOString();
    
    // 尝试获取锁 - 插入锁记录
    const { error: lockError } = await supabaseClient
      .from('scrape_tasks')
      .insert({
        industry_id: -1, // 特殊标识：锁记录
        target_date: 'lock',
        status: 'coordinator_lock',
        batch_id: lockId,
        created_at: lockExpiry, // 使用created_at作为过期时间
        error_message: 'Scraper coordinator distributed lock'
      });

    // 如果插入失败，检查是否有其他活跃的锁
    if (lockError) {
      // 检查是否有未过期的锁
      const { data: existingLocks } = await supabaseClient
        .from('scrape_tasks')
        .select('id')
        .eq('status', 'coordinator_lock')
        .eq('industry_id', -1)
        .gte('created_at', new Date().toISOString())
        .limit(1);

      if (existingLocks && existingLocks.length > 0) {
        console.log('Scraper Coordinator: Another instance is already running, skipping...')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Another coordinator instance is running',
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
      .eq('status', 'coordinator_lock')
      .eq('industry_id', -1)
      .lt('created_at', new Date().toISOString());

    // 3. 检查并重置超时任务
    console.log('Scraper Coordinator: Checking for timeout tasks...');
    const { data: timeoutTasks, error: timeoutError } = await supabaseClient
      .from('scrape_tasks')
      .select('id, retry_count, max_retries, industry_id, started_at, batch_id')
      .eq('status', 'scraping')
      .lt('started_at', new Date(Date.now() - TASK_TIMEOUT).toISOString());

    if (timeoutError) {
      console.error('Error checking timeout tasks:', timeoutError);
    }

    if (timeoutTasks && timeoutTasks.length > 0) {
      console.log(`⚠️ Scraper Coordinator: Found ${timeoutTasks.length} timeout tasks, analyzing...`);
      
      // 详细记录超时任务信息
      timeoutTasks.forEach(task => {
        const timeoutDuration = Date.now() - new Date(task.started_at).getTime();
        const timeoutMinutes = Math.floor(timeoutDuration / 60000);
        console.log(`⏰ Timeout Task Details:`, {
          taskId: task.id,
          industryId: task.industry_id,
          batchId: task.batch_id,
          startedAt: task.started_at,
          timeoutMinutes: timeoutMinutes,
          retryCount: task.retry_count,
          maxRetries: task.max_retries
        });
      });
      
      // 重置未超过最大重试次数的超时任务
      const retryableTimeoutTasks = timeoutTasks.filter(task => 
        task.retry_count < (task.max_retries || MAX_TASK_RETRIES)
      );
      const failedTimeoutTasks = timeoutTasks.filter(task => 
        task.retry_count >= (task.max_retries || MAX_TASK_RETRIES)
      );
      
      console.log(`🔄 Retryable timeout tasks: ${retryableTimeoutTasks.length}, Failed timeout tasks: ${failedTimeoutTasks.length}`);
      
      if (retryableTimeoutTasks.length > 0) {
        for (const task of retryableTimeoutTasks) {
          const newRetryCount = task.retry_count + 1;
          console.log(`🔁 Retrying timeout task ${task.id} (attempt ${newRetryCount}/${task.max_retries || MAX_TASK_RETRIES})`);
          
          await supabaseClient
            .from('scrape_tasks')
            .update({
              status: 'pending_scrape',
              retry_count: newRetryCount,
              error_message: `Task timeout after ${Math.floor(TASK_TIMEOUT/60000)} minutes, retrying... (attempt ${newRetryCount})`,
              started_at: null
            })
            .eq('id', task.id);
        }
      }
      
      if (failedTimeoutTasks.length > 0) {
        console.log(`❌ Marking ${failedTimeoutTasks.length} tasks as failed due to max retries exceeded`);
        
        await supabaseClient
          .from('scrape_tasks')
          .update({
            status: 'failed',
            error_message: `Task timeout after multiple retries. Max timeout: ${Math.floor(TASK_TIMEOUT/60000)} minutes, Max retries: ${MAX_TASK_RETRIES}`,
            completed_at: new Date().toISOString()
          })
          .in('id', failedTimeoutTasks.map(t => t.id));
      }
    }

    // 4. 检查并重试失败的任务（30分钟后重试，优化间隔）
    console.log('Scraper Coordinator: Checking for retryable failed tasks...');
    const { data: retryTasks } = await supabaseClient
      .from('scrape_tasks')
      .select('*')
      .eq('status', 'failed')
      .filter('retry_count', 'lt', MAX_TASK_RETRIES)
      .lt('completed_at', new Date(Date.now() - 1800000).toISOString()); // 30分钟后重试 (优化间隔)

    if (retryTasks && retryTasks.length > 0) {
      console.log(`🔄 Scraper Coordinator: Found ${retryTasks.length} retryable failed tasks`);
      
      for (const task of retryTasks) {
        const newRetryCount = task.retry_count + 1;
        console.log(`🔁 Retrying failed task ${task.id} (industry ${task.industry_id}, attempt ${newRetryCount}/${MAX_TASK_RETRIES})`);
        
        await supabaseClient
          .from('scrape_tasks')
          .update({
            status: 'pending_scrape',
            retry_count: newRetryCount,
            error_message: `Retrying failed task (attempt ${newRetryCount}/${MAX_TASK_RETRIES})`,
            started_at: null,
            completed_at: null
          })
          .eq('id', task.id);
      }
    }

    // 5. 检查正在运行的任务数量
    console.log('Scraper Coordinator: Checking for running scraping tasks...');
    const { data: runningTasks, error: runningError } = await supabaseClient
      .from('scrape_tasks')
      .select('id')
      .eq('status', 'scraping')
      .gt('industry_id', 0); // 排除锁记录

    if (runningError) {
      throw new Error(`Failed to check running tasks: ${runningError.message}`);
    }

    const runningTaskCount = runningTasks?.length || 0;
    console.log(`Scraper Coordinator: Found ${runningTaskCount} running scraping tasks`);

    // 如果已经有2个或更多任务在运行，不处理新任务
    if (runningTaskCount >= 2) {
      console.log('Scraper Coordinator: Maximum concurrent tasks reached, skipping new task processing')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Maximum concurrent tasks reached (${runningTaskCount}/2), skipping new task processing`,
          tasksProcessed: 0,
          runningTasks: runningTaskCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. 获取待处理的任务，根据剩余容量限制
    const availableSlots = 2 - runningTaskCount;
    const taskLimit = Math.min(BATCH_SIZE, availableSlots);
    
    console.log(`Scraper Coordinator: Available slots: ${availableSlots}, will process up to ${taskLimit} tasks`);
    
    const { data: pendingTasks, error: fetchError } = await supabaseClient
      .from('scrape_tasks')
      .select(`
        id,
        industry_id,
        target_date,
        batch_id,
        retry_count,
        max_retries
      `)
      .eq('status', 'pending_scrape')
      .gt('industry_id', 0) // 排除锁记录
      .order('created_at', { ascending: true })
      .limit(taskLimit);

    if (fetchError) {
      throw new Error(`Failed to fetch pending tasks: ${fetchError.message}`);
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('Scraper Coordinator: No pending tasks found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending tasks to process',
          tasksProcessed: 0,
          runningTasks: runningTaskCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraper Coordinator: Found ${pendingTasks.length} pending tasks, will process with ${runningTaskCount} already running`);

    // 7. 使用事务更新任务状态为 'scraping'
    const taskIds = pendingTasks.map(task => task.id);
    const { error: updateError } = await supabaseClient
      .from('scrape_tasks')
      .update({
        status: 'scraping',
        started_at: new Date().toISOString()
      })
      .in('id', taskIds)
      .eq('status', 'pending_scrape'); // 添加状态检查防止竞争条件

    if (updateError) {
      throw new Error(`Failed to update task status: ${updateError.message}`);
    }

    // 8. 准备调用 reddit-scraper 的参数
    const industryIds = pendingTasks.map(task => task.industry_id);
    const batchIds = [...new Set(pendingTasks.map(task => task.batch_id))];
    const targetDate = pendingTasks[0].target_date;

    const scraperPayload = {
      industry_ids: industryIds,
      target_date: targetDate,
      task_ids: taskIds,
      batch_id: batchIds[0]
    };

    console.log('Scraper Coordinator: Calling reddit-scraper with payload:', {
      ...scraperPayload,
      industry_ids: scraperPayload.industry_ids.length + ' industries',
      task_ids: scraperPayload.task_ids.length + ' tasks'
    });

    // 9. 触发 reddit-scraper 函数 (改进错误处理)
    console.log('Scraper Coordinator: Triggering reddit-scraper...');
    
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/reddit-scraper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scraperPayload)
    }).then(async response => {
      if (response.ok) {
        console.log('Scraper Coordinator: Successfully triggered reddit-scraper');
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Scraper Coordinator: Failed to trigger reddit-scraper: ${response.status} - ${errorText}`);
        
        // 如果触发失败，重置任务状态并记录错误
        await supabaseClient
          .from('scrape_tasks')
          .update({
            status: 'pending_scrape',
            error_message: `Failed to trigger reddit-scraper: ${response.status} - ${errorText}`,
            started_at: null
          })
          .in('id', taskIds);
      }
    }).catch(async error => {
      console.error('Scraper Coordinator: Error triggering reddit-scraper:', error);
      
      // 网络错误或其他异常，重置任务状态
      await supabaseClient
        .from('scrape_tasks')
        .update({
          status: 'pending_scrape',
          error_message: `Error triggering reddit-scraper: ${error.message}`,
          started_at: null
        })
        .in('id', taskIds);
    });
    
    console.log('Scraper Coordinator: Reddit scraper triggered, tasks handed off');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully triggered ${pendingTasks.length} scraping tasks`,
        tasksProcessed: pendingTasks.length,
        timeoutTasksReset: (timeoutTasks?.filter(t => t.retry_count < (t.max_retries || MAX_TASK_RETRIES)).length) || 0,
        timeoutTasksFailed: (timeoutTasks?.filter(t => t.retry_count >= (t.max_retries || MAX_TASK_RETRIES)).length) || 0,
        failedTasksRetried: retryTasks?.length || 0,
        runningTasksBefore: runningTaskCount,
        totalRunningAfter: runningTaskCount + pendingTasks.length,
        optimizedTimeoutMinutes: Math.floor(TASK_TIMEOUT / 60000),
        maxRetries: MAX_TASK_RETRIES
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraper Coordinator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Scraper coordinator failed',
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
        .eq('status', 'coordinator_lock');
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }
}) 
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskCreatorRequest {
  targetDate: string;           // YYYY-MM-DD format
  industryIds?: number[];       // 可选，默认处理所有行业
  forceCreate?: boolean;        // 是否强制创建（即使有pending任务）
}

interface TaskCreatorResponse {
  success: boolean;
  batchId: string;
  tasksCreated: number;
  message: string;
  errors?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { targetDate, industryIds, forceCreate = false }: TaskCreatorRequest = await req.json()

    // Validate targetDate format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(targetDate)) {
      throw new Error('Invalid date format. Must be YYYY-MM-DD')
    }

    // Validate that the date is not in the future
    const targetDateObj = new Date(targetDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (targetDateObj > today) {
      throw new Error('Cannot scrape data from future dates')
    }

    // Validate that the date is not too old (optional, you can adjust this)
    const minDate = new Date('2020-01-01')
    if (targetDateObj < minDate) {
      throw new Error('Cannot scrape data from before 2020-01-01')
    }

    // Generate unique batch ID
    const batchId = crypto.randomUUID()

    // Get target industries
    let targetIndustries: number[]
    if (industryIds && industryIds.length > 0) {
      targetIndustries = industryIds
    } else {
      // Get all industries
      const { data: industries, error: industriesError } = await supabaseClient
        .from('industries')
        .select('id')
      
      if (industriesError) {
        throw new Error(`Failed to fetch industries: ${industriesError.message}`)
      }
      
      targetIndustries = industries.map(ind => ind.id)
    }

    // Check for existing pending tasks if not forcing creation
    if (!forceCreate) {
      const { data: pendingTasks, error: pendingError } = await supabaseClient
        .from('scrape_tasks')
        .select('industry_id')
        .in('status', ['pending_scrape', 'scraping', 'pending_analysis', 'analyzing'])
        .in('industry_id', targetIndustries)
        .eq('target_date', targetDate)

      if (pendingError) {
        console.warn(`Warning: Could not check pending tasks: ${pendingError.message}`)
      } else if (pendingTasks && pendingTasks.length > 0) {
        const pendingIndustryIds = pendingTasks.map(task => task.industry_id)
        return new Response(
          JSON.stringify({
            success: false,
            batchId: '',
            tasksCreated: 0,
            message: `There are already pending tasks for date ${targetDate} and industries: ${pendingIndustryIds.join(', ')}. Use forceCreate=true to override.`,
            errors: [`Pending tasks exist for ${pendingTasks.length} industries on ${targetDate}`]
          } as TaskCreatorResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409
          }
        )
      }
    }

    // Create scrape tasks for each industry
    const tasksToCreate = targetIndustries.map(industryId => ({
      industry_id: industryId,
      target_date: targetDate,
      status: 'pending_scrape',
      batch_id: batchId,
      posts_scraped: 0,
      posts_processed: 0,
      ideas_generated: 0,
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString()
    }))

    const { data: createdTasks, error: createError } = await supabaseClient
      .from('scrape_tasks')
      .insert(tasksToCreate)
      .select()

    if (createError) {
      throw new Error(`Failed to create tasks: ${createError.message}`)
    }

    console.log(`Created ${createdTasks.length} scrape tasks with batch ID: ${batchId} for date: ${targetDate}`)

    return new Response(
      JSON.stringify({
        success: true,
        batchId,
        tasksCreated: createdTasks.length,
        message: `Successfully created ${createdTasks.length} scrape tasks for date: ${targetDate}`,
        errors: []
      } as TaskCreatorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Task Creator Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        batchId: '',
        tasksCreated: 0,
        message: 'Failed to create scrape tasks',
        errors: [error.message]
      } as TaskCreatorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskResult {
  task: string;
  success: boolean;
  message: string;
  data?: any;
}

async function callEdgeFunction(functionName: string, payload: any = {}): Promise<TaskResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    return {
      task: functionName,
      success: response.ok && result.success,
      message: result.message || `${functionName} completed`,
      data: result
    };
  } catch (error) {
    return {
      task: functionName,
      success: false,
      message: `${functionName} failed: ${error.message}`,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting daily scheduled Reddit scraping (analyzer will be auto-triggered)...')
    
    const results = {
      scraper: null,
      totalTime: 0
    }
    
    const startTime = Date.now()
    
    try {
      // Step 1: Run Reddit Scraper with 1-day time range (will auto-trigger analyzer)
      console.log('Step 1: Starting Reddit scraping for last 24 hours (will auto-trigger analyzer)...')
      const scraperResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/reddit-scraper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeRange: '24h' })
      })
      
      const scraperResult = await scraperResponse.json()
      results.scraper = scraperResult
      
      if (!scraperResult.success) {
        console.error('Reddit scraping failed:', scraperResult.error)
      } else {
        console.log(`Reddit scraping completed: ${scraperResult.totalScraped} posts processed`)
        if (scraperResult.analyzerTriggered) {
          console.log('DeepSeek analyzer was auto-triggered by reddit-scraper')
        }
      }
      
    } catch (error) {
      console.error('Error in Reddit scraping step:', error)
      results.scraper = { success: false, error: error.message }
    }
    
    const endTime = Date.now()
    results.totalTime = endTime - startTime
    
    // Generate summary
    const scrapedPosts = results.scraper?.totalScraped || 0
    const scraperSuccess = results.scraper?.success || false
    const analyzerTriggered = results.scraper?.analyzerTriggered || false
    
    console.log(`Daily scheduled task completed in ${results.totalTime}ms`)
    console.log(`Posts scraped: ${scrapedPosts}, Analyzer auto-triggered: ${analyzerTriggered}`)
    
    return new Response(
      JSON.stringify({
        success: scraperSuccess,
        message: `Daily task completed: ${scrapedPosts} posts scraped, analyzer ${analyzerTriggered ? 'auto-triggered' : 'not needed'} (24h timeframe)`,
        timeRange: '24h',
        results: {
          scraper: {
            success: scraperSuccess,
            postsScraped: scrapedPosts,
            analyzerTriggered: analyzerTriggered,
            error: results.scraper?.error || null
          }
        },
        executionTime: results.totalTime,
        timestamp: new Date().toISOString()
      }),
      {
        status: scraperSuccess ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
      
  } catch (error) {
    console.error('Scheduler failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 
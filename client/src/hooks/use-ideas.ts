import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { StartupIdea, DailyStats, IdeasResponse } from '@/lib/types';

interface UseIdeasFilters {
  industryId?: number;
  keywords?: string;
  minUpvotes?: number;
  sortBy?: 'upvotes' | 'comments' | 'recent' | 'confidence';
  timeRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  page?: number;
  pageSize?: number;
}

export function useIdeas(filters: UseIdeasFilters = {}) {
  const { page = 1, pageSize = 20 } = filters;
  const { user } = useAuth();

  return useQuery<IdeasResponse>({
    queryKey: ['ideas', filters, user?.id],
    queryFn: async () => {
      // For non-authenticated users, restrict to today's top 3 ideas only
      const isAuthenticated = !!user;
      
      let query = supabase
        .from('startup_ideas')
        .select(`
          *,
          industry:industries!industry_id(*)
        `, { count: 'exact' });

      // For unauthenticated users, only show today's top ideas
      if (!isAuthenticated) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .order('upvotes', { ascending: false })
          .limit(3);
      } else {
        // Apply filters first for authenticated users
        if (filters.industryId) {
          query = query.eq('industry_id', filters.industryId);
        }

        if (filters.keywords) {
          query = query.or(`title.ilike.%${filters.keywords}%,summary.ilike.%${filters.keywords}%`);
        }

        if (filters.minUpvotes) {
          query = query.gte('upvotes', filters.minUpvotes);
        }

        // Apply time range filter based on target_date
        if (filters.timeRange && filters.timeRange !== 'all') {
          const now = new Date();
          let startDate: Date;
          
          switch (filters.timeRange) {
            case 'today':
              // Get ideas based on today's target date
              const today = new Date();
              const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
              query = query.eq('target_date', todayString);
              break;
            case 'yesterday':
              // Get ideas based on yesterday's target date
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
              query = query.eq('target_date', yesterdayString);
              break;
            case 'week':
              // Get ideas from the last 7 days of target dates
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const weekStartString = startDate.toISOString().split('T')[0];
              query = query.gte('target_date', weekStartString);
              break;
            case 'month':
              // Get ideas from the last 30 days of target dates
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              const monthStartString = startDate.toISOString().split('T')[0];
              query = query.gte('target_date', monthStartString);
              break;
            default:
              startDate = new Date(0);
              query = query.gte('target_date', startDate.toISOString().split('T')[0]);
          }
        }

        // Apply sorting after filters
        switch (filters.sortBy) {
          case 'upvotes':
            query = query.order('upvotes', { ascending: false });
            break;
          case 'comments':
            query = query.order('comments', { ascending: false });
            break;
          case 'confidence':
            query = query.order('confidence_score', { ascending: false });
            break;
          case 'recent':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Apply pagination last, after all filters are applied
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
      }

      const { data: ideas, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch ideas: ${error.message}`);
      }

      // Map database field names to frontend expected field names
      const mappedIdeas = (ideas || []).map(idea => ({
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        industryId: idea.industry_id,
        upvotes: idea.upvotes,
        comments: idea.comments,
        keywords: idea.keywords || [],
        subreddit: idea.subreddit,
        redditPostUrls: idea.reddit_post_urls || [],
        existingSolutions: idea.existing_solutions,
        solutionGaps: idea.solution_gaps,
        marketSize: idea.market_size,
        targetDate: idea.target_date,
        createdAt: idea.created_at,
        updatedAt: idea.updated_at,
        confidenceScore: idea.confidence_score,
        industry: idea.industry
      }));

      // For unauthenticated users, return limited data
      const totalCount = !isAuthenticated ? 3 : (count || 0);
      const currentPageSize = !isAuthenticated ? 3 : pageSize;

      return {
        ideas: mappedIdeas,
        total: totalCount,
        page,
        pageSize: currentPageSize,
        totalPages: Math.ceil(totalCount / currentPageSize),
        isLimited: !isAuthenticated
      };
    },
  });
}

export function useDailyStats() {
  return useQuery<DailyStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      // Get real stats from database
      const { count: totalIdeas } = await supabase
        .from('startup_ideas')
        .select('*', { count: 'exact', head: true });

      const { count: totalIndustries } = await supabase
        .from('industries')
        .select('*', { count: 'exact', head: true });

      // Get average upvotes
      const { data: avgData } = await supabase
        .from('startup_ideas')
        .select('upvotes');
      
      const avgUpvotes = avgData && avgData.length > 0 
        ? Math.round(avgData.reduce((sum, item) => sum + (item.upvotes || 0), 0) / avgData.length)
        : 0;

      return {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        totalIdeas: totalIdeas || 0,
        newIndustries: totalIndustries || 0,
        avgUpvotes: avgUpvotes,
        successRate: totalIdeas && totalIdeas > 0 ? 87.5 : 0 // Mock success rate for now
      };
    },
  });
}

// Note: Edge Functions are not deployed yet, so these are disabled for local development
// Uncomment these when Edge Functions are deployed to production

// export function useScrapeTrigger() {
//   return async () => {
//     const response = await fetch(
//       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reddit-scraper`,
//       {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({})
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Scraping failed: ${response.status} - ${errorText}`);
//     }

//     return response.json();
//   };
// }

// export function useAnalysisTrigger() {
//   return async (forceAnalyze = false) => {
//     const response = await fetch(
//       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-analyzer`,
//       {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ forceAnalyze })
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
//     }

//     return response.json();
//   };
// }

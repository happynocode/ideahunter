import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import type { StartupIdea, DailyStats, IdeasResponse } from '@/lib/types';

interface UseIdeasFilters {
  industryId?: number;
  keywords?: string;
  minUpvotes?: number;
  sortBy?: 'upvotes' | 'comments' | 'recent';
  timeRange?: 'today' | 'week' | 'month' | 'all';
  page?: number;
  pageSize?: number;
}

export function useIdeas(filters: UseIdeasFilters = {}) {
  const { page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;

  return useQuery<IdeasResponse>({
    queryKey: ['ideas', filters],
    queryFn: async () => {
      let query = supabase
        .from('startup_ideas')
        .select(`
          *,
          industry:industries(*)
        `, { count: 'exact' });

      // Apply filters
      if (filters.industryId) {
        query = query.eq('industryId', filters.industryId);
      }

      if (filters.keywords) {
        query = query.or(`title.ilike.%${filters.keywords}%,summary.ilike.%${filters.keywords}%`);
      }

      if (filters.minUpvotes) {
        query = query.gte('upvotes', filters.minUpvotes);
      }

      if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        let cutoffTime: Date;
        
        switch (filters.timeRange) {
          case 'today':
            cutoffTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoffTime = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            cutoffTime = new Date(0);
        }
        
        query = query.gte('createdAt', cutoffTime.toISOString());
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'upvotes':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'comments':
          query = query.order('comments', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('createdAt', { ascending: false });
          break;
      }

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        ideas: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
  });
}

export function useDailyStats() {
  return useQuery<DailyStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default stats if none exist
      return data || {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        totalIdeas: 0,
        newIndustries: 13,
        avgUpvotes: 0,
        successRate: 0
      };
    },
  });
}

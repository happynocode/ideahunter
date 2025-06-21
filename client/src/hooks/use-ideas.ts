import { useQuery } from "@tanstack/react-query";
import type { IdeasResponse, DailyStats } from "@/lib/types";

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
  const queryParams = new URLSearchParams();
  
  if (filters.industryId) queryParams.append('industryId', filters.industryId.toString());
  if (filters.keywords) queryParams.append('keywords', filters.keywords);
  if (filters.minUpvotes) queryParams.append('minUpvotes', filters.minUpvotes.toString());
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.timeRange) queryParams.append('timeRange', filters.timeRange);
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.pageSize) queryParams.append('pageSize', filters.pageSize.toString());

  return useQuery<IdeasResponse>({
    queryKey: ['/api/ideas', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/ideas?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ideas');
      }
      return response.json();
    },
  });
}

export function useDailyStats() {
  return useQuery<DailyStats>({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
  });
}

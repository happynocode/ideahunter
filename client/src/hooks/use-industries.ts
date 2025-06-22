import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import type { Industry } from '@/lib/types';

export function useIndustries() {
  return useQuery<Industry[]>({
    queryKey: ['industries'],
    queryFn: async () => {
      // Fallback to direct database query instead of Edge Function
      const { data: industries, error } = await supabase
        .from('industries')
        .select('*')
        .order('id');

      if (error) {
        throw new Error(`Failed to fetch industries: ${error.message}`);
      }

      // Get idea counts for each industry
      const industriesWithCounts = await Promise.all(
        (industries || []).map(async (industry) => {
          const { count } = await supabase
            .from('startup_ideas')
            .select('*', { count: 'exact', head: true })
            .eq('industry_id', industry.id);
          
          return {
            ...industry,
            ideaCount: count || 0
          };
        })
      );

      return industriesWithCounts;
    },
  });
}

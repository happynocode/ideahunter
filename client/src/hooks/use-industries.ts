import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import type { Industry } from '@/lib/types';

export function useIndustries() {
  return useQuery<Industry[]>({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Add idea count to each industry
      const industriesWithCounts = await Promise.all(
        (data || []).map(async (industry: any) => {
          const { count } = await supabase
            .from('startup_ideas')
            .select('*', { count: 'exact', head: true })
            .eq('industryId', industry.id);
          
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

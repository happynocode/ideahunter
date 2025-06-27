import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { Favorite, StartupIdea, IdeasResponse } from '@/lib/types';
import { useMemo } from 'react';

// Hook to get user's favorites
export function useFavorites(page: number = 1, pageSize: number = 20) {
  const { user } = useAuth();

  // 添加唯一标识符确保每次查询都是新的
  const uniqueKey = useMemo(() => Math.random().toString(36), [page, pageSize]);

  return useQuery<IdeasResponse>({
    queryKey: ['favorites', user?.id, page, pageSize, uniqueKey],
    queryFn: async () => {
      console.log('Favorites - Query executing for user:', user?.id, 'page:', page);
      
      if (!user) {
        console.log('Favorites - No user, returning empty result');
        return {
          ideas: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        };
      }

      const query = supabase
        .from('favorites')
        .select(`
          *,
          startup_ideas!startupIdeaId(
            *,
            industry:industries!industryId(*)
          )
        `, { count: 'exact' })
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data: favorites, error, count } = await query;

      console.log('Favorites - Query result:', {
        favoritesCount: favorites?.length || 0,
        totalCount: count,
        error: error?.message
      });

      if (error) {
        // Handle range not satisfiable error gracefully
        if (error.message.includes('Range Not Satisfiable') || error.code === 'PGRST103') {
          console.warn('Range not satisfiable for favorites, returning empty result');
          return {
            ideas: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0
          };
        }
        throw new Error(`Failed to fetch favorites: ${error.message}`);
      }

      // Map favorites to ideas format
      const ideas: StartupIdea[] = (favorites || []).map(favorite => {
        const idea = favorite.startup_ideas;
        return {
          id: idea.id,
          title: idea.title,
          summary: idea.summary,
          industryId: idea.industryId,
          upvotes: idea.upvotes,
          comments: idea.comments,
          keywords: idea.keywords || [],
          subreddit: idea.subreddit,
          redditPostUrls: idea.redditPostUrls || [],
          existingSolutions: idea.existingSolutions,
          solutionGaps: idea.solutionGaps,
          marketSize: idea.marketSize,
          targetDate: idea.targetDate,
          createdAt: idea.createdAt,
          updatedAt: idea.updatedAt,
          confidenceScore: idea.confidenceScore,
          industry: idea.industry,
          isFavorited: true
        };
      });

      console.log('Favorites - Mapped ideas:', ideas.length);

      return {
        ideas,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: !!user,
    // 与ideas hook保持一致的缓存策略
    staleTime: 0, // 立即过期
    gcTime: 0, // 立即垃圾回收，不缓存
    retry: 1, // 减少重试次数
    refetchOnWindowFocus: false, // 禁用窗口聚焦时自动重新获取
    refetchOnMount: true, // 组件挂载时重新获取
  });
}

// Hook to check if ideas are favorited
export function useFavoriteStatus(ideaIds: number[]) {
  const { user } = useAuth();

  return useQuery<Record<number, boolean>>({
    queryKey: ['favorite-status', user?.id, ideaIds],
    queryFn: async () => {
      if (!user || ideaIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('startupIdeaId')
        .eq('userId', user.id)
        .in('startupIdeaId', ideaIds);

      if (error) {
        throw new Error(`Failed to check favorite status: ${error.message}`);
      }

      const statusMap: Record<number, boolean> = {};
      ideaIds.forEach(id => {
        statusMap[id] = false;
      });

      (data || []).forEach(favorite => {
        statusMap[favorite.startupIdeaId] = true;
      });

      return statusMap;
    },
    enabled: !!user && ideaIds.length > 0
  });
}

// Hook to toggle favorite status
export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, isFavorited }: { ideaId: number; isFavorited: boolean }) => {
      if (!user) {
        throw new Error('User must be logged in to favorite ideas');
      }

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('userId', user.id)
          .eq('startupIdeaId', ideaId);

        if (error) {
          throw new Error(`Failed to remove favorite: ${error.message}`);
        }
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            userId: user.id,
            startupIdeaId: ideaId
          });

        if (error) {
          throw new Error(`Failed to add favorite: ${error.message}`);
        }
      }

      return { ideaId, isFavorited: !isFavorited };
    },
    onSuccess: ({ ideaId, isFavorited }) => {
      // Update favorite status cache
      queryClient.setQueryData(['favorite-status', user?.id, [ideaId]], (old: Record<number, boolean> | undefined) => ({
        ...old,
        [ideaId]: isFavorited
      }));

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['favorite-status', user?.id] });
    }
  });
} 
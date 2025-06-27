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

      // 先获取用户的收藏夹列表
      const { data: favoritesList, error: favoritesError, count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      console.log('Favorites - Step 1 result:', {
        favoritesCount: favoritesList?.length || 0,
        totalCount: count,
        error: favoritesError?.message,
        firstFavorite: favoritesList?.[0]
      });

      if (favoritesError) {
        throw new Error(`Failed to fetch favorites: ${favoritesError.message}`);
      }

      if (!favoritesList || favoritesList.length === 0) {
        return {
          ideas: [],
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize)
        };
      }

      // 获取相关的startup ideas
      const ideaIds = favoritesList.map(fav => fav.startup_idea_id);
      const { data: startupIdeas, error: ideasError } = await supabase
        .from('startup_ideas')
        .select(`
          *,
          industries!inner(*)
        `)
        .in('id', ideaIds);

      console.log('Favorites - Step 2 result:', {
        ideasCount: startupIdeas?.length || 0,
        ideaIds,
        error: ideasError?.message,
        firstIdea: startupIdeas?.[0]
      });

      if (ideasError) {
        throw new Error(`Failed to fetch startup ideas: ${ideasError.message}`);
      }

      // 映射数据
      const ideas: StartupIdea[] = (startupIdeas || []).map(idea => ({
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
        industry: idea.industries,
        isFavorited: true
      }));

      console.log('Favorites - Final mapped ideas:', ideas.length);

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
        .select('startup_idea_id')
        .eq('user_id', user.id)
        .in('startup_idea_id', ideaIds);

      if (error) {
        throw new Error(`Failed to check favorite status: ${error.message}`);
      }

      const statusMap: Record<number, boolean> = {};
      ideaIds.forEach(id => {
        statusMap[id] = false;
      });

      (data || []).forEach(favorite => {
        statusMap[favorite.startup_idea_id] = true;
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
          .eq('user_id', user.id)
          .eq('startup_idea_id', ideaId);

        if (error) {
          throw new Error(`Failed to remove favorite: ${error.message}`);
        }
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            startup_idea_id: ideaId
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
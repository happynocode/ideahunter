import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { Favorite, StartupIdea, IdeasResponse } from '@/lib/types';

// Hook to get user's favorites
export function useFavorites(page: number = 1, pageSize: number = 20) {
  const { user } = useAuth();

  return useQuery<IdeasResponse>({
    queryKey: ['favorites', user?.id, page, pageSize],
    queryFn: async () => {
      if (!user) {
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
          startup_ideas!startup_idea_id(
            *,
            industry:industries!industry_id(*)
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data: favorites, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch favorites: ${error.message}`);
      }

      // Map favorites to ideas format
      const ideas: StartupIdea[] = (favorites || []).map(favorite => {
        const idea = favorite.startup_ideas;
        return {
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
          industry: idea.industry,
          isFavorited: true
        };
      });

      return {
        ideas,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: !!user
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
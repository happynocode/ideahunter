import { ArrowUp, MessageSquare, Calendar, Lock, Users, Loader2, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth.tsx";
import { useFavoriteStatus, useToggleFavorite } from "@/hooks/use-favorites";
import { useState, useEffect } from "react";
import type { StartupIdea } from "@/lib/types";
import { formatTargetDate } from "@/lib/utils";
import AuthModal from "./auth-modal";
import { getIndustryColor } from "@/lib/industry-colors";
import { useToast } from "@/hooks/use-toast";

interface IdeaGridProps {
  ideas: StartupIdea[];
  isLoading: boolean;
  isLimited?: boolean;
  onIdeaClick: (ideaId: number) => void;
  isFetching?: boolean;
}

export default function IdeaGrid({ ideas, isLoading, isLimited, onIdeaClick, isFetching }: IdeaGridProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // 添加调试日志
  console.log('IdeaGrid - Rendering with:', {
    ideasCount: ideas.length,
    isLoading,
    isFetching,
    isLimited,
    firstIdeaTitle: ideas[0]?.title || 'No ideas'
  });

  // Get favorite status for all ideas
  const ideaIds = ideas.map(idea => idea.id);
  const { data: favoriteStatus } = useFavoriteStatus(ideaIds);
  const toggleFavoriteMutation = useToggleFavorite();

  const handleFavoriteClick = async (e: React.MouseEvent, ideaId: number) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const isFavorited = favoriteStatus?.[ideaId] || false;
    
    try {
      await toggleFavoriteMutation.mutateAsync({ ideaId, isFavorited });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited ? "Idea removed from your favorites" : "Idea saved to your favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="loading-skeleton rounded-xl h-64"></div>
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="glass-card rounded-xl p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Ideas Found</h3>
          <p className="text-gray-400">Try adjusting your search criteria or filters to find more startup ideas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Limited Access Banner for unauthenticated users */}
      {!user && isLimited && (
        <div className="glass-card rounded-xl p-6 border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-orange-400/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-300 mb-1">
                  Showing top 3 trending ideas only
                </h3>
                <p className="text-amber-200/80 text-sm">
                  Sign up to view all startup ideas, history, and filter by industry
                </p>
              </div>
            </div>
            <Button
              onClick={() => setAuthModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Sign Up Now
            </Button>
          </div>
        </div>
      )}

      {/* Fetching Indicator */}
      {isFetching && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2 text-neon-blue">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Updating results...</span>
          </div>
        </div>
      )}

      {/* Ideas Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${isFetching ? 'opacity-70 transition-opacity duration-200' : ''}`}>
        {ideas.map((idea) => {
          const isFavorited = favoriteStatus?.[idea.id] || false;
          
          return (
            <Card 
              key={idea.id}
              className="idea-card glass-card rounded-xl p-6 neon-glow cursor-pointer border-0 bg-transparent hover:bg-white/20 transition-colors duration-200 relative"
              onClick={() => onIdeaClick(idea.id)}
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-4">
                  <Badge 
                    className="px-3 py-1 rounded-full text-xs font-medium border"
                    style={{ 
                      backgroundColor: `${getIndustryColor((idea.industry as any)?.name || 'Uncategorized')}20`, 
                      color: getIndustryColor((idea.industry as any)?.name || 'Uncategorized'),
                      borderColor: `${getIndustryColor((idea.industry as any)?.name || 'Uncategorized')}40`
                    }}
                  >
                    {(idea.industry as any)?.name || 'Uncategorized'}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-gray-400 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>{idea.upvotes}</span>
                    </div>
                    {/* Favorite Button */}
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`p-2 h-8 w-8 rounded-full transition-all duration-200 ${
                          isFavorited 
                            ? 'text-pink-400 hover:text-pink-500 bg-pink-400/20 hover:bg-pink-400/30' 
                            : 'text-gray-400 hover:text-pink-400 hover:bg-pink-400/20'
                        }`}
                        onClick={(e) => handleFavoriteClick(e, idea.id)}
                        disabled={toggleFavoriteMutation.isPending}
                      >
                        <Heart 
                          className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} 
                        />
                      </Button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
                  {idea.title}
                </h3>
                
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {idea.summary}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {idea.keywords.slice(0, 3).map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-white/10 text-gray-300 px-2 py-1 rounded text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {idea.keywords.length > 3 && (
                    <Badge variant="secondary" className="bg-white/10 text-gray-300 px-2 py-1 rounded text-xs">
                      +{idea.keywords.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-3">
                    <span>{idea.subreddit}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Based on {formatTargetDate(idea.targetDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{idea.comments} comments</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        defaultTab="signup"
      />
    </div>
  );
}

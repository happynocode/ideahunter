import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUp, MessageSquare, Clock, Bookmark, ExternalLink, AlertCircle, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth.tsx";
import { useFavoriteStatus, useToggleFavorite } from "@/hooks/use-favorites";
import { useState } from "react";
import AuthModal from "./auth-modal";
import type { StartupIdea } from "@/lib/types";

interface IdeaDetailModalProps {
  ideaId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IdeaDetailModal({ ideaId, open, onOpenChange }: IdeaDetailModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const { data: idea, isLoading } = useQuery({
    queryKey: ['idea', ideaId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/queryClient');
      const { data, error } = await supabase
        .from('startup_ideas')
        .select(`
          id,
          title,
          summary,
          industry_id,
          upvotes,
          comments,
          keywords,
          subreddit,
          reddit_post_urls,
          existing_solutions,
          solution_gaps,
          market_size,
          target_date,
          confidence_score,
          source_post_ids,
          created_at,
          updated_at,
          industry:industries!industry_id(*)
        `)
        .eq('id', ideaId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ideaId && open,
  });

  // Get favorite status for this idea
  const { data: favoriteStatus } = useFavoriteStatus(ideaId ? [ideaId] : []);
  const toggleFavoriteMutation = useToggleFavorite();

  const isFavorited = favoriteStatus?.[ideaId!] || false;

  const getIndustryColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'neon-blue': 'bg-cyan-400/20 text-cyan-400',
      'neon-purple': 'bg-purple-400/20 text-purple-400',
      'violet-400': 'bg-violet-400/20 text-violet-400',
      'green-400': 'bg-green-400/20 text-green-400',
      'yellow-400': 'bg-yellow-400/20 text-yellow-400',
      'orange-400': 'bg-orange-400/20 text-orange-400',
    };
    return colorMap[color] || 'bg-gray-400/20 text-gray-400';
  };

  const handleFavoriteClick = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!ideaId) return;

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

  if (!ideaId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto glass-card border-white/20 bg-transparent neon-glow"
          aria-describedby="idea-description"
        >
          {isLoading ? (
            <div className="space-y-6 p-8">
              <DialogTitle className="sr-only">Loading...</DialogTitle>
              <DialogDescription id="idea-description" className="sr-only">
                Loading startup idea details
              </DialogDescription>
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-32 bg-white/10" />
                  <Skeleton className="h-8 w-3/4 bg-white/10" />
                </div>
                <Skeleton className="h-8 w-8 bg-white/10" />
              </div>
              <Skeleton className="h-32 w-full bg-white/10" />
            </div>
          ) : idea ? (
            <>
              <DialogTitle className="text-2xl font-bold text-white mb-4">{idea.title}</DialogTitle>
              <DialogDescription id="idea-description" className="sr-only">
                Detailed view of startup idea: {idea.title}
              </DialogDescription>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="p-6"
                  >
                    
                    {/* Modal Header */}
                    <div className="mb-8">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <Badge 
                              className="px-3 py-1 rounded-full text-sm"
                              style={{ 
                                backgroundColor: `${(idea.industry as any)?.color || '#6b7280'}20`, 
                                color: (idea.industry as any)?.color || '#6b7280',
                                border: `1px solid ${(idea.industry as any)?.color || '#6b7280'}40`
                              }}
                            >
                              {(idea.industry as any)?.name || 'Uncategorized'}
                            </Badge>
                            <div className="flex items-center space-x-4 text-gray-400 text-sm">
                              <span className="flex items-center space-x-1">
                                <ArrowUp className="w-4 h-4" />
                                <span>{idea.upvotes} upvotes</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageSquare className="w-4 h-4" />
                                <span>{idea.comments} comments</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>Based on {(idea as any).target_date ? new Date((idea as any).target_date).toLocaleDateString('en-US') : 'Unknown date'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Add to Favorites Button in Header */}
                        {user && (
                          <Button
                            onClick={handleFavoriteClick}
                            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                              isFavorited 
                                ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-400/30' 
                                : 'bg-white/10 hover:bg-pink-500/20 hover:text-pink-400 text-white border border-white/20'
                            }`}
                            disabled={toggleFavoriteMutation.isPending}
                          >
                            <Bookmark className="w-4 h-4 mr-2" />
                            {isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Keywords Section - Top Row */}
                    <div className="mb-8">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                        <h3 className="text-lg font-semibold text-white">Keywords</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {idea.keywords && idea.keywords.length > 0 ? (
                          idea.keywords.map((keyword: string, index: number) => (
                            <Badge key={index} className="bg-cyan-400/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-medium">
                              {keyword}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No keywords</span>
                        )}
                      </div>
                    </div>

                    {/* Hero Section - Problem Summary (Prominently Featured) */}
                    <div className="mb-8">
                      <Card className="glass-card border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-600/5 rounded-xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center mb-6">
                            <div className="w-3 h-3 bg-cyan-400 rounded-full mr-4 shadow-lg shadow-cyan-400/50"></div>
                            <h2 className="text-3xl font-bold text-white">Problem Summary</h2>
                            <div className="ml-4 px-3 py-1 bg-cyan-400/20 rounded-full">
                              <span className="text-cyan-400 text-sm font-semibold">Core Issue</span>
                            </div>
                          </div>
                          <p className="text-gray-200 leading-relaxed text-lg font-medium">{idea.summary}</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-3xl"></div>
                      </Card>
                    </div>

                    {/* Key Pain Points Section (Prominently Featured) */}
                    {idea.solution_gaps && (
                      <div className="mb-8">
                        <Card className="glass-card border-red-400/30 bg-gradient-to-br from-red-500/10 to-orange-600/10 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-orange-600/5 rounded-xl"></div>
                          <div className="relative z-10">
                            <div className="flex items-center mb-6">
                              <div className="w-3 h-3 bg-red-400 rounded-full mr-4 shadow-lg shadow-red-400/50"></div>
                              <h2 className="text-3xl font-bold text-white">Key Pain Points</h2>
                              <div className="ml-4 px-3 py-1 bg-red-400/20 rounded-full">
                                <span className="text-red-400 text-sm font-semibold">Critical Issues</span>
                              </div>
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-red-400/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                              </div>
                              <p className="text-gray-200 leading-relaxed text-lg font-medium">{idea.solution_gaps}</p>
                            </div>
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/10 to-transparent rounded-full blur-3xl"></div>
                        </Card>
                      </div>
                    )}

                    {/* Market Information Section */}
                    <div className="mb-8 space-y-6">
                      <div className="grid grid-cols-1 gap-6">
                        {/* Market Size */}
                        <Card className="glass-card border-green-400/20 bg-gradient-to-r from-green-500/5 to-emerald-600/5 rounded-lg p-6">
                          <CardHeader className="pb-4 px-0 pt-0">
                            <CardTitle className="text-lg font-semibold text-white flex items-center">
                              <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                              Market Size & Opportunity
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-0 pb-0">
                            <p className="text-gray-300 text-lg font-semibold">
                              {idea.market_size || 'Market size analysis not available'}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Existing Solutions */}
                        {idea.existing_solutions && (
                          <Card className="glass-card border-purple-400/20 bg-gradient-to-r from-purple-500/5 to-violet-600/5 rounded-lg p-6">
                            <CardHeader className="pb-4 px-0 pt-0">
                              <CardTitle className="text-lg font-semibold text-white flex items-center">
                                <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                                Current Market Solutions
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0 pb-0">
                              <p className="text-gray-300 leading-relaxed">{idea.existing_solutions}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row - Source Discussions, Statistics & Confidence */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Source Discussions */}
                      <Card className="glass-card border-orange-400/20 bg-gradient-to-br from-orange-500/5 to-red-600/5 rounded-lg p-6">
                        <CardHeader className="pb-4 px-0 pt-0">
                          <CardTitle className="text-lg font-bold text-white flex items-center">
                            <i className="fab fa-reddit text-orange-500 mr-3 text-xl"></i>
                            Source Discussions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div className="space-y-3">
                            {idea.reddit_post_urls && idea.reddit_post_urls.length > 0 ? (
                              idea.reddit_post_urls.map((url: string, index: number) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-orange-400/30 transition-all duration-200 group"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-orange-400 font-semibold text-sm">r/{idea.subreddit}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
                                  </div>
                                  <p className="text-gray-300 text-sm font-medium">Discussion #{index + 1}</p>
                                </a>
                              ))
                            ) : (
                              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-gray-400 text-sm">No source links available</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Idea Statistics */}
                      <Card className="glass-card border-white/20 bg-transparent rounded-lg p-6">
                        <CardHeader className="pb-4 px-0 pt-0">
                          <CardTitle className="text-lg font-semibold text-white">Idea Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Source Posts</span>
                              <span className="text-white font-semibold">{idea.reddit_post_urls?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Total Upvotes</span>
                              <span className="text-green-400 font-semibold">{idea.upvotes}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Comments</span>
                              <span className="text-blue-400 font-semibold">{idea.comments}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Confidence Score */}
                      <Card className="glass-card border-white/20 bg-transparent rounded-lg p-6">
                        <CardHeader className="pb-4 px-0 pt-0">
                          <CardTitle className="text-lg font-semibold text-white flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                            Confidence Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Success Probability</span>
                              <span className="text-yellow-400 text-lg font-bold">{idea.confidence_score || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-500 shadow-lg shadow-yellow-400/30" 
                                style={{ width: `${(idea.confidence_score || 0)}%` }}
                              ></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <>
              <DialogTitle className="sr-only">Not Found</DialogTitle>
              <DialogDescription id="idea-description" className="sr-only">
                Startup idea not found
              </DialogDescription>
              <div className="text-center py-12">
                <p className="text-gray-400">Idea not found</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {authModalOpen && <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />}
    </>
  );
}

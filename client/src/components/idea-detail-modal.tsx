import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUp, MessageSquare, Clock, Bookmark, Share, ExternalLink, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { StartupIdea } from "@/lib/types";

interface IdeaDetailModalProps {
  ideaId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IdeaDetailModal({ ideaId, open, onOpenChange }: IdeaDetailModalProps) {
  const { toast } = useToast();

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

  const handleSave = () => {
    toast({
      title: "Idea Saved",
      description: "This idea has been saved to your favorites.",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Idea link has been copied to your clipboard.",
    });
  };

  if (!ideaId) return null;

  return (
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
                  <div className="mb-6">
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
                    </div>
                  </div>

                  {/* Top Section - Key Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Keywords */}
                    <Card className="glass-card border-white/20 bg-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-white flex items-center">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2"></span>
                          Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {idea.keywords && idea.keywords.length > 0 ? (
                            idea.keywords.map((keyword: string, index: number) => (
                              <Badge key={index} className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded text-xs">
                                {keyword}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No keywords</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market Size */}
                    <Card className="glass-card border-white/20 bg-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-white flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                          Market Size
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-green-400 text-sm font-medium">
                          {idea.market_size || 'Not specified'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Confidence Score */}
                    <Card className="glass-card border-white/20 bg-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-white flex items-center">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                          Confidence
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full" 
                              style={{ width: `${(idea.confidence_score || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-yellow-400 text-sm">{idea.confidence_score || 0}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main Content Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                      {/* Problem Summary */}
                      <div className="glass-card border-white/20 bg-transparent rounded-lg p-5">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                          <span className="w-1 h-6 bg-cyan-400 rounded-full mr-3"></span>
                          Problem Summary
                        </h3>
                        <p className="text-gray-300 leading-relaxed text-base">{idea.summary}</p>
                      </div>

                      {/* Key Pain Points */}
                      {idea.solution_gaps && (
                        <div className="glass-card border-white/20 bg-transparent rounded-lg p-5">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <span className="w-1 h-6 bg-red-400 rounded-full mr-3"></span>
                            Key Pain Points
                          </h3>
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                            <p className="text-gray-300 leading-relaxed text-base">{idea.solution_gaps}</p>
                          </div>
                        </div>
                      )}

                      {/* Existing Solutions */}
                      {idea.existing_solutions && (
                        <div className="glass-card border-white/20 bg-transparent rounded-lg p-5">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <span className="w-1 h-6 bg-purple-400 rounded-full mr-3"></span>
                            Current Market Solutions
                          </h3>
                          <p className="text-gray-300 leading-relaxed text-base">{idea.existing_solutions}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Reddit Sources & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Reddit Sources */}
                      <div className="glass-card border-white/20 bg-transparent rounded-lg p-5">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                          <i className="fab fa-reddit text-orange-500 mr-2"></i>
                          Source Discussions
                        </h3>
                        <div className="space-y-3">
                          {idea.reddit_post_urls && idea.reddit_post_urls.length > 0 ? (
                            idea.reddit_post_urls.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-orange-400 font-medium text-sm">r/{idea.subreddit}</span>
                                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                </div>
                                <p className="text-gray-300 text-sm">Discussion #{index + 1}</p>
                                <p className="text-xs text-gray-500 mt-1">Click to view original post</p>
                              </a>
                            ))
                          ) : (
                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-gray-400 text-sm">No source links available</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-4">
                        <Button
                          onClick={handleSave}
                          className="w-full glass-card rounded-lg py-4 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0 font-semibold"
                        >
                          <Bookmark className="w-5 h-5 mr-2" />
                          Save to Favorites
                        </Button>
                        <Button
                          onClick={handleShare}
                          className="w-full glass-card rounded-lg py-4 text-white hover:bg-white/20 transition-all duration-200 border-0 font-semibold"
                        >
                          <Share className="w-5 h-5 mr-2" />
                          Share Idea
                        </Button>
                      </div>

                      {/* Additional Info */}
                      <div className="glass-card border-white/20 bg-transparent rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-white mb-3">Idea Stats</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Source Posts</span>
                            <span className="text-white">{idea.reddit_post_urls?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Upvotes</span>
                            <span className="text-green-400">{idea.upvotes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Comments</span>
                            <span className="text-blue-400">{idea.comments}</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
  );
}

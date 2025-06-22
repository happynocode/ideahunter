import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUp, MessageSquare, Clock, Bookmark, Share, ExternalLink, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface IdeaDetailModalProps {
  ideaId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IdeaDetailModal({ ideaId, open, onOpenChange }: IdeaDetailModalProps) {
  const { toast } = useToast();

  const { data: idea, isLoading } = useQuery<StartupIdea>({
    queryKey: ['idea', ideaId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/queryClient');
      const { data, error } = await supabase
        .from('startup_ideas')
        .select(`
          *,
          industry:industries(*)
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-white/20 bg-transparent neon-glow">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              {isLoading ? (
                <div className="space-y-6">
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
                  {/* Modal Header */}
                  <DialogHeader className="mb-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Badge className={`${getIndustryColor(idea.industry?.color || 'gray-400')} px-3 py-1 rounded-full text-sm`}>
                            {idea.industry?.name || 'Unknown'}
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
                              <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">{idea.title}</h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                  </DialogHeader>

                  {/* Modal Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Problem Summary</h3>
                        <p className="text-gray-300 leading-relaxed">{idea.summary}</p>
                      </div>

                      {idea.solutionGaps && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Key Pain Points</h3>
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                            <span className="text-gray-300">{idea.solutionGaps}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Original Reddit Posts</h3>
                        <div className="space-y-3">
                          {idea.redditPostUrls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block glass-card rounded-lg p-4 hover:bg-white/20 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-3 mb-2">
                                <i className="fab fa-reddit text-orange-500"></i>
                                <span className="text-cyan-400 font-medium">{idea.subreddit}</span>
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                              </div>
                              <p className="text-white text-sm">Reddit discussion #{index + 1}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Market Opportunity */}
                      {idea.marketSize && (
                        <Card className="glass-card border-white/20 bg-transparent">
                          <CardHeader>
                            <CardTitle className="font-semibold text-white">Market Opportunity</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Market Size</span>
                                <span className="text-green-400">{idea.marketSize}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Existing Solutions */}
                      {idea.existingSolutions && (
                        <Card className="glass-card border-white/20 bg-transparent">
                          <CardHeader>
                            <CardTitle className="font-semibold text-white">Existing Solutions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-300 text-sm">{idea.existingSolutions}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Keywords */}
                      <Card className="glass-card border-white/20 bg-transparent">
                        <CardHeader>
                          <CardTitle className="font-semibold text-white">Keywords</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {idea.keywords.map((keyword, index) => (
                              <Badge key={index} className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      <div className="space-y-3">
                        <Button
                          onClick={handleSave}
                          className="w-full glass-card rounded-lg py-3 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0"
                        >
                          <Bookmark className="w-4 h-4 mr-2" />
                          Save Idea
                        </Button>
                        <Button
                          onClick={handleShare}
                          className="w-full glass-card rounded-lg py-3 text-white hover:bg-white/20 transition-all duration-200 border-0"
                        >
                          <Share className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">Idea not found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

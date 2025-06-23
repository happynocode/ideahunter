import { ArrowUp, MessageSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { StartupIdea } from "@/lib/types";
import { formatTargetDate } from "@/lib/utils";

interface IdeaGridProps {
  ideas: StartupIdea[];
  isLoading: boolean;
  onIdeaClick: (ideaId: number) => void;
}

export default function IdeaGrid({ ideas, isLoading, onIdeaClick }: IdeaGridProps) {
  const getIndustryColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'neon-blue': 'bg-cyan-400/20 text-cyan-400',
      'neon-purple': 'bg-purple-400/20 text-purple-400',
      'violet-400': 'bg-violet-400/20 text-violet-400',
      'green-400': 'bg-green-400/20 text-green-400',
      'yellow-400': 'bg-yellow-400/20 text-yellow-400',
      'orange-400': 'bg-orange-400/20 text-orange-400',
      'blue-400': 'bg-blue-400/20 text-blue-400',
      'pink-400': 'bg-pink-400/20 text-pink-400',
      'indigo-400': 'bg-indigo-400/20 text-indigo-400',
      'red-400': 'bg-red-400/20 text-red-400',
      'cyan-400': 'bg-cyan-400/20 text-cyan-400',
      'purple-400': 'bg-purple-400/20 text-purple-400',
      'emerald-400': 'bg-emerald-400/20 text-emerald-400',
    };
    return colorMap[color] || 'bg-gray-400/20 text-gray-400';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {ideas.map((idea) => (
        <Card 
          key={idea.id}
          className="idea-card glass-card rounded-xl p-6 neon-glow cursor-pointer border-0 bg-transparent hover:bg-white/20 transition-colors duration-200"
          onClick={() => onIdeaClick(idea.id)}
        >
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-4">
              <Badge className={`${getIndustryColor(idea.industry?.color || 'gray-400')} px-3 py-1 rounded-full text-xs font-medium`}>
                {idea.industry?.name || 'Unknown'}
              </Badge>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>{idea.upvotes}</span>
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
                  <span>基于 {formatTargetDate(idea.targetDate)}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-3 h-3" />
                <span>{idea.comments} comments</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

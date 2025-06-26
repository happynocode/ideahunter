import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import IdeaGrid from "@/components/idea-grid";
import IdeaDetailModal from "@/components/idea-detail-modal";

import SearchFilters from "@/components/search-filters";
import ParticleBackground from "@/components/particle-background";
import { useIdeas } from "@/hooks/use-ideas";
import { useFavorites } from "@/hooks/use-favorites";
import { useIndustries } from "@/hooks/use-industries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth.tsx";
import UserMenu from "@/components/user-menu";
import { AdminRequired } from "@/components/protected-route";
import { getIndustryColor } from "@/lib/industry-colors";

export default function Dashboard() {
  const [selectedIndustry, setSelectedIndustry] = useState<number | undefined>();
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'upvotes' | 'comments' | 'recent'>('upvotes');
  const [minUpvotes, setMinUpvotes] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [allIdeas, setAllIdeas] = useState<any[]>([]);
  
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { data: industries } = useIndustries();

  // Debug log
  console.log('Dashboard - User:', user?.email, 'isAdmin:', isAdmin);

  // 使用useMemo来稳定filter对象，避免不必要的重新查询
  const stableFilters = useMemo(() => ({
    industryId: selectedIndustry,
    keywords: searchQuery,
    sortBy,
    minUpvotes,
    timeRange,
    page: currentPage,
    pageSize: 20
  }), [selectedIndustry, searchQuery, sortBy, minUpvotes, timeRange, currentPage]);

  const { data: ideasData, isLoading, isFetching } = useIdeas(stableFilters);
  const { data: favoritesData, isLoading: favoritesLoading } = useFavorites(currentPage, 20);

  // Determine which data to show based on showFavorites
  const currentData = showFavorites ? favoritesData : ideasData;
  const currentLoading = showFavorites ? favoritesLoading : (isLoading || isFetching);

  // Reset page when filters change
  const resetFilters = () => {
    setCurrentPage(1);
  };

  // Load more ideas function
  const handleLoadMore = () => {
    if (currentData && !currentLoading) {
      const hasMorePages = currentPage < currentData.totalPages;
      if (hasMorePages) {
        setCurrentPage(prev => prev + 1);
      }
    }
  };

  // Update combined ideas when new data arrives
  useEffect(() => {
    if (currentData?.ideas) {
      if (currentPage === 1) {
        // 新的第一页数据，替换所有现有数据
        setAllIdeas(currentData.ideas);
      } else {
        // 追加分页数据
        setAllIdeas(prev => [...prev, ...currentData.ideas]);
      }
    }
  }, [currentData, currentPage]);

  // Reset pagination when filters change (but not immediately clear data)
  useEffect(() => {
    resetFilters();
  }, [selectedIndustry, showFavorites, searchQuery, sortBy, minUpvotes, timeRange]);

  // Reset ideas when switching between favorites and regular view
  useEffect(() => {
    setAllIdeas([]);
    setCurrentPage(1);
  }, [showFavorites]);

  // 计算是否应该显示loading状态
  const shouldShowLoading = currentLoading && currentPage === 1 && allIdeas.length === 0;

  // Get current section title and description
  const getSectionInfo = () => {
    if (showFavorites) {
      return {
        title: "Your Favorites",
        description: "Ideas you've saved for later"
      };
    } else if (selectedIndustry && industries) {
      const industry = industries.find(i => i.id === selectedIndustry);
      return {
        title: "Trending Ideas",
        description: `Showing ideas from ${industry?.name || 'selected industry'}`
      };
    } else {
      return {
        title: "Trending Ideas",
        description: "Discover trending opportunities from Reddit communities"
      };
    }
  };

  const { title, description } = getSectionInfo();

  return (
    <div className="gradient-bg text-white min-h-screen relative overflow-x-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 flex min-h-screen">
        <Sidebar 
          selectedIndustry={selectedIndustry}
          showFavorites={showFavorites}
          onIndustrySelect={setSelectedIndustry}
          onFavoritesSelect={setShowFavorites}
        />
        
        <div className="flex-1 p-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <h2 className="text-3xl font-bold text-white">{title}</h2>
                {showFavorites && (
                  <Heart className="w-6 h-6 text-pink-400 fill-current" />
                )}
                {selectedIndustry && industries && !showFavorites && (
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className="px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: `${getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || '')}30`,
                        color: getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || ''),
                        border: `1px solid ${getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || '')}50`
                      }}
                    >
                      <i className={`${industries.find(i => i.id === selectedIndustry)?.icon || 'fas fa-folder'} mr-2`}></i>
                      {industries.find(i => i.id === selectedIndustry)?.name || 'Unknown Industry'}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-gray-400">{description}</p>
            </div>
            <div className="flex space-x-4 items-center">
              {/* Only show Admin Panel for admin users */}
              {user && isAdmin && (
                <Link href="/admin">
                  <Button
                    className="glass-card rounded-lg px-4 py-2 text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 border border-neon-blue/50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}

              <UserMenu />
            </div>
          </motion.div>

          {/* Only show search filters when not viewing favorites */}
          {!showFavorites && (
            <SearchFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              minUpvotes={minUpvotes}
              onMinUpvotesChange={setMinUpvotes}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}

          <IdeaGrid
            ideas={allIdeas}
            isLoading={shouldShowLoading}
            isLimited={currentData?.isLimited}
            onIdeaClick={setSelectedIdea}
            isFetching={currentLoading && currentPage === 1}
          />

          {/* Load More */}
          {currentData && currentPage < currentData.totalPages && (
            <div className="text-center mt-8">
              <Button 
                onClick={handleLoadMore}
                disabled={currentLoading}
                className="glass-card rounded-lg px-8 py-3 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0 disabled:opacity-50"
              >
                {currentLoading ? "Loading..." : "Load More Ideas"}
              </Button>
            </div>
          )}

          {/* Empty state for favorites */}
          {showFavorites && !favoritesLoading && (!favoritesData?.ideas || favoritesData.ideas.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No favorites yet</h3>
              <p className="text-gray-500">Start exploring ideas and save the ones you like!</p>
            </motion.div>
          )}
        </div>
      </div>

      <IdeaDetailModal
        ideaId={selectedIdea}
        open={!!selectedIdea}
        onOpenChange={(open) => !open && setSelectedIdea(undefined)}
      />
    </div>
  );
}

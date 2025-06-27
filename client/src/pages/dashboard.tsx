import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useParams } from "wouter";
import Sidebar from "@/components/sidebar";
import IdeaGrid from "@/components/idea-grid";
import IdeaDetailModal from "@/components/idea-detail-modal";

import SearchFilters from "@/components/search-filters";
import ParticleBackground from "@/components/particle-background";
import { useIdeas } from "@/hooks/use-ideas";
import { useFavorites } from "@/hooks/use-favorites";
import { useIndustries } from "@/hooks/use-industries";
import { useIsMobile } from "@/hooks/use-mobile.tsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth.tsx";
import UserMenu from "@/components/user-menu";
import { AdminRequired } from "@/components/protected-route";
import { getIndustryColor } from "@/lib/industry-colors";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const params = useParams();
  const isMobile = useIsMobile();
  
  // 从URL获取行业ID，如果存在的话
  const industryFromUrl = params.industryId ? parseInt(params.industryId) : undefined;
  const showFavoritesFromUrl = location.includes('favorites');
  
  const [selectedIndustry, setSelectedIndustry] = useState<number | undefined>(industryFromUrl);
  const [showFavorites, setShowFavorites] = useState(showFavoritesFromUrl);
  const [selectedIdea, setSelectedIdea] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'upvotes' | 'comments' | 'recent'>('upvotes');
  const [minUpvotes, setMinUpvotes] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [allIdeas, setAllIdeas] = useState<any[]>([]);
  const [lastFilterKey, setLastFilterKey] = useState('');
  
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { data: industries } = useIndustries();

  // Debug log
  console.log('Dashboard - User:', user?.email, 'isAdmin:', isAdmin);

  // 处理行业选择，同时更新URL
  const handleIndustrySelect = (industryId?: number) => {
    console.log('Dashboard - handleIndustrySelect called with:', industryId);
    console.log('Dashboard - Before update - selectedIndustry:', selectedIndustry, 'showFavorites:', showFavorites);
    
    setSelectedIndustry(industryId);
    setShowFavorites(false);
    setAllIdeas([]); // 立即清空数据
    setCurrentPage(1);
    
    // 更新URL
    if (industryId) {
      setLocation(`/dashboard/industry/${industryId}`);
    } else {
      setLocation('/dashboard');
    }
    
    // 强制重置过滤器状态
    const newFilterKey = `${industryId || 'all'}-${Date.now()}`;
    setLastFilterKey(newFilterKey);
    
    console.log('Dashboard - After update - industryId:', industryId, 'newFilterKey:', newFilterKey);
  };

  // 处理收藏夹选择，同时更新URL
  const handleFavoritesSelect = (showFav: boolean) => {
    console.log('Dashboard - handleFavoritesSelect called with:', showFav);
    console.log('Dashboard - Before update - selectedIndustry:', selectedIndustry, 'showFavorites:', showFavorites);
    
    setShowFavorites(showFav);
    setSelectedIndustry(undefined);
    setAllIdeas([]); // 立即清空数据
    setCurrentPage(1);
    
    // 更新URL
    if (showFav) {
      setLocation('/dashboard/favorites');
    } else {
      setLocation('/dashboard');
    }
    
    // 强制重置过滤器状态
    const newFilterKey = `favorites-${showFav}-${Date.now()}`;
    setLastFilterKey(newFilterKey);
    
    console.log('Dashboard - After update - showFavorites:', showFav, 'newFilterKey:', newFilterKey);
  };

  // 使用useMemo来稳定filter对象，并添加唯一标识符
  const stableFilters = useMemo(() => ({
    industryId: selectedIndustry,
    keywords: searchQuery,
    sortBy,
    minUpvotes,
    timeRange,
    page: currentPage,
    pageSize: 20,
    // 添加唯一标识符确保每次筛选都会重新查询
    _uniqueId: lastFilterKey
  }), [selectedIndustry, searchQuery, sortBy, minUpvotes, timeRange, currentPage, lastFilterKey]);

  const { data: ideasData, isLoading, isFetching, refetch: refetchIdeas } = useIdeas(stableFilters);
  const { data: favoritesData, isLoading: favoritesLoading, refetch: refetchFavorites } = useFavorites(currentPage, 20);

  // Determine which data to show based on showFavorites
  const currentData = showFavorites ? favoritesData : ideasData;
  const currentLoading = showFavorites ? favoritesLoading : (isLoading || isFetching);

  // Debug current data state
  console.log('Dashboard - Data state:', {
    showFavorites,
    favoritesData: favoritesData ? { 
      ideasCount: favoritesData.ideas?.length || 0,
      total: favoritesData.total 
    } : null,
    ideasData: ideasData ? { 
      ideasCount: ideasData.ideas?.length || 0,
      total: ideasData.total 
    } : null,
    currentData: currentData ? { 
      ideasCount: currentData.ideas?.length || 0,
      total: currentData.total 
    } : null,
    allIdeasLength: allIdeas.length
  });

  // Reset page when filters change
  const resetFilters = () => {
    setCurrentPage(1);
    setAllIdeas([]);
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
    console.log('Dashboard - currentData update:', {
      currentDataExists: !!currentData,
      ideasLength: currentData?.ideas?.length || 0,
      currentPage,
      showFavorites,
      allIdeasLength: allIdeas.length
    });
    
    if (currentData?.ideas !== undefined) {
      if (currentPage === 1) {
        // 新的第一页数据，替换所有现有数据（包括空数组）
        console.log('Dashboard - Setting allIdeas to:', currentData.ideas.length, 'ideas');
        setAllIdeas([...currentData.ideas]); // 使用展开运算符确保新数组
      } else if (currentData.ideas.length > 0) {
        // 追加分页数据，但确保不会出现重复数据
        setAllIdeas(prev => {
          const existingIds = new Set(prev.map(idea => idea.id));
          const newIdeas = currentData.ideas.filter(idea => !existingIds.has(idea.id));
          return [...prev, ...newIdeas];
        });
      }
    }
  }, [currentData?.ideas, currentPage, showFavorites]); // 依赖于ideas数组而不是整个currentData对象

  // Reset everything when any filter changes (including industry) - 简化版本
  useEffect(() => {
    console.log('Dashboard - Filter reset effect triggered:', {
      selectedIndustry, showFavorites, searchQuery, sortBy, minUpvotes, timeRange
    });
    
    console.log('Dashboard - Resetting allIdeas and currentPage');
    setAllIdeas([]);
    setCurrentPage(1);
    
    // 不需要手动refetch，React Query会自动处理
  }, [selectedIndustry, showFavorites, searchQuery, sortBy, minUpvotes, timeRange]);

  // URL变化时同步状态
  useEffect(() => {
    if (industryFromUrl !== selectedIndustry) {
      setSelectedIndustry(industryFromUrl);
      setShowFavorites(false);
    }
    if (showFavoritesFromUrl !== showFavorites) {
      setShowFavorites(showFavoritesFromUrl);
      setSelectedIndustry(undefined);
    }
  }, [industryFromUrl, showFavoritesFromUrl]);

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
      
      <div className={`relative z-10 ${isMobile ? 'block' : 'flex'} min-h-screen`}>
        <Sidebar 
          selectedIndustry={selectedIndustry}
          showFavorites={showFavorites}
          onIndustrySelect={handleIndustrySelect}
          onFavoritesSelect={handleFavoritesSelect}
        />
        
        <div className={`${isMobile ? 'w-full' : 'flex-1'} p-4 md:p-8 ${isMobile ? 'mt-16' : ''}`}>
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 space-y-4 md:space-y-0"
          >
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-2">
                <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
                {showFavorites && (
                  <Heart className="w-5 h-5 md:w-6 md:h-6 text-pink-400 fill-current" />
                )}
                {selectedIndustry && industries && !showFavorites && (
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium"
                      style={{
                        backgroundColor: `${getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || '')}30`,
                        color: getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || ''),
                        border: `1px solid ${getIndustryColor(industries.find(i => i.id === selectedIndustry)?.name || '')}50`
                      }}
                    >
                      <i className={`${industries.find(i => i.id === selectedIndustry)?.icon || 'fas fa-folder'} mr-1 md:mr-2`}></i>
                      {industries.find(i => i.id === selectedIndustry)?.name || 'Unknown Industry'}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm md:text-base">{description}</p>
            </div>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-stretch md:items-center w-full md:w-auto">
              {/* Only show Admin Panel for admin users */}
              {user && isAdmin && (
                <Link href="/admin">
                  <Button
                    className="w-full md:w-auto glass-card rounded-lg px-3 md:px-4 py-2 text-neon-blue hover:bg-neon-blue/20 transition-all duration-200 border border-neon-blue/50 text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1 md:mr-2" />
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
            ideas={showFavorites ? (currentData?.ideas || []) : allIdeas}
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

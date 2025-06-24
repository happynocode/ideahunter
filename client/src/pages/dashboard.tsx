import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import IdeaGrid from "@/components/idea-grid";
import IdeaDetailModal from "@/components/idea-detail-modal";
import StatsCards from "@/components/stats-cards";
import SearchFilters from "@/components/search-filters";
import ParticleBackground from "@/components/particle-background";
import { useIdeas } from "@/hooks/use-ideas";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth.tsx";
import UserMenu from "@/components/user-menu";
import { AdminRequired } from "@/components/protected-route";

export default function Dashboard() {
  const [selectedIndustry, setSelectedIndustry] = useState<number | undefined>();
  const [selectedIdea, setSelectedIdea] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'upvotes' | 'comments' | 'recent'>('upvotes');
  const [minUpvotes, setMinUpvotes] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [allIdeas, setAllIdeas] = useState<any[]>([]);
  
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Debug log
  console.log('Dashboard - User:', user?.email, 'isAdmin:', isAdmin);

  const { data: ideasData, isLoading } = useIdeas({
    industryId: selectedIndustry,
    keywords: searchQuery,
    sortBy,
    minUpvotes,
    timeRange,
    page: currentPage,
    pageSize: 20
  });

  // Reset page when filters change
  const resetFilters = () => {
    setCurrentPage(1);
    setAllIdeas([]);
  };

  // Load more ideas function
  const handleLoadMore = () => {
    if (ideasData && !isLoading) {
      const hasMorePages = currentPage < ideasData.totalPages;
      if (hasMorePages) {
        setCurrentPage(prev => prev + 1);
      }
    }
  };

  // Update combined ideas when new data arrives
  useEffect(() => {
    if (ideasData?.ideas) {
      if (currentPage === 1) {
        setAllIdeas(ideasData.ideas);
      } else {
        setAllIdeas(prev => [...prev, ...ideasData.ideas]);
      }
    }
  }, [ideasData, currentPage]);

  // Reset pagination when filters change
  useEffect(() => {
    resetFilters();
  }, [selectedIndustry, searchQuery, sortBy, minUpvotes, timeRange]);



  return (
    <div className="gradient-bg text-white min-h-screen relative overflow-x-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 flex min-h-screen">
        <Sidebar 
          selectedIndustry={selectedIndustry}
          onIndustrySelect={setSelectedIndustry}
        />
        
        <div className="flex-1 p-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Trending Ideas</h2>
              <p className="text-gray-400">Discover trending opportunities from Reddit communities</p>
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

          <StatsCards />

          <IdeaGrid
            ideas={allIdeas}
            isLoading={isLoading && currentPage === 1}
            isLimited={ideasData?.isLimited}
            onIdeaClick={setSelectedIdea}
          />

          {/* Load More */}
          {ideasData && currentPage < ideasData.totalPages && (
            <div className="text-center mt-8">
              <Button 
                onClick={handleLoadMore}
                disabled={isLoading}
                className="glass-card rounded-lg px-8 py-3 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0 disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load More Ideas"}
              </Button>
            </div>
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

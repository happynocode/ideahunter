import { useState } from "react";
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
import { Download, FileCode, Settings } from "lucide-react";
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
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  
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
    page: 1,
    pageSize: 20
  });

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/export/${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `startup-ideas.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Ideas exported as ${format.toUpperCase()} file`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export ideas. Please try again.",
        variant: "destructive",
      });
    }
  };

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
              <h2 className="text-3xl font-bold text-white mb-2">Startup Ideas Dashboard</h2>
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
              <Button 
                onClick={() => handleExport('csv')}
                className="glass-card rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => handleExport('json')}
                className="glass-card rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-all duration-200 border-0"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
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
            ideas={ideasData?.ideas || []}
            isLoading={isLoading}
            isLimited={ideasData?.isLimited}
            onIdeaClick={setSelectedIdea}
          />

          {/* Load More */}
          <div className="text-center mt-8">
            <Button className="glass-card rounded-lg px-8 py-3 text-white hover:bg-white/20 transition-all duration-200 neon-glow border-0">
              Load More Ideas
            </Button>
          </div>
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

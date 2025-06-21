import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/sidebar";
import IdeaGrid from "@/components/idea-grid";
import IdeaDetailModal from "@/components/idea-detail-modal";
import StatsCards from "@/components/stats-cards";
import SearchFilters from "@/components/search-filters";
import ParticleBackground from "@/components/particle-background";
import { useIdeas } from "@/hooks/use-ideas";
import { Button } from "@/components/ui/button";
import { Download, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedIndustry, setSelectedIndustry] = useState<number | undefined>();
  const [selectedIdea, setSelectedIdea] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'upvotes' | 'comments' | 'recent'>('upvotes');
  const [minUpvotes, setMinUpvotes] = useState<number | undefined>();
  
  const { toast } = useToast();

  const { data: ideasData, isLoading } = useIdeas({
    industryId: selectedIndustry,
    keywords: searchQuery,
    sortBy,
    minUpvotes,
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
            <div className="flex space-x-4">
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
            </div>
          </motion.div>

          <SearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            minUpvotes={minUpvotes}
            onMinUpvotesChange={setMinUpvotes}
          />

          <StatsCards />

          <IdeaGrid
            ideas={ideasData?.ideas || []}
            isLoading={isLoading}
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

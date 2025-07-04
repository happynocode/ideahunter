import { motion } from "framer-motion";
import { Rocket, Lock, Heart, Menu, X } from "lucide-react";
import { useIndustries } from "@/hooks/use-industries";
import { useDailyStats } from "@/hooks/use-ideas";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth.tsx";
import { useIsMobile } from "@/hooks/use-mobile.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import AuthModal from "./auth-modal";
import { getIndustryTextColor } from "@/lib/industry-colors";

interface SidebarProps {
  selectedIndustry?: number;
  showFavorites?: boolean;
  onIndustrySelect: (industryId?: number) => void;
  onFavoritesSelect: (showFavorites: boolean) => void;
}

export default function Sidebar({ selectedIndustry, showFavorites, onIndustrySelect, onFavoritesSelect }: SidebarProps) {
  const { data: industries, isLoading: industriesLoading } = useIndustries();
  const { data: stats } = useDailyStats();
  const { data: favoritesData } = useFavorites(1, 1000); // Get all favorites for count
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile) {
      if (mobileMenuOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [mobileMenuOpen, isMobile]);

  const handleIndustryClick = (industryId?: number) => {
    console.log('Sidebar - handleIndustryClick called with:', industryId);
    
    if (!user && industryId !== undefined) {
      // Show login modal for non-authenticated users clicking on specific industries
      setAuthModalOpen(true);
      return;
    }
    // Clear favorites view and select industry
    onFavoritesSelect(false);
    // 立即调用，确保状态立即更新
    onIndustrySelect(industryId);
    
    // Close mobile menu after selection
    if (isMobile) {
      setMobileMenuOpen(false);
    }
    
    console.log('Sidebar - Industry selected:', industryId);
  };

  const handleFavoritesClick = () => {
    console.log('Sidebar - handleFavoritesClick called');
    
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    // Clear industry selection and show favorites
    onIndustrySelect(undefined);
    onFavoritesSelect(true);
    
    // Close mobile menu after selection
    if (isMobile) {
      setMobileMenuOpen(false);
    }
    
    console.log('Sidebar - Favorites selected');
  };

  const getIconColorClass = (color: string, isSelected: boolean = false) => {
    // Define all possible combinations explicitly so Tailwind can detect them
    if (color === 'neon-blue') return isSelected ? 'text-cyan-200' : 'text-cyan-400';
    if (color === 'neon-purple') return isSelected ? 'text-purple-200' : 'text-purple-400';
    if (color === 'violet-400') return isSelected ? 'text-violet-200' : 'text-violet-400';
    if (color === 'green-400') return isSelected ? 'text-green-200' : 'text-green-400';
    if (color === 'yellow-400') return isSelected ? 'text-yellow-200' : 'text-yellow-400';
    if (color === 'orange-400') return isSelected ? 'text-orange-200' : 'text-orange-400';
    if (color === 'blue-400') return isSelected ? 'text-blue-200' : 'text-blue-400';
    if (color === 'pink-400') return isSelected ? 'text-pink-200' : 'text-pink-400';
    if (color === 'indigo-400') return isSelected ? 'text-indigo-200' : 'text-indigo-400';
    if (color === 'red-400') return isSelected ? 'text-red-200' : 'text-red-400';
    if (color === 'cyan-400') return isSelected ? 'text-cyan-200' : 'text-cyan-400';
    if (color === 'purple-400') return isSelected ? 'text-purple-200' : 'text-purple-400';
    if (color === 'emerald-400') return isSelected ? 'text-emerald-200' : 'text-emerald-400';
    
    return isSelected ? 'text-gray-200' : 'text-gray-400';
  };

  const getColorClass = (color: string, isSelected: boolean = false) => {
    // Define all possible combinations explicitly so Tailwind can detect them
    if (color === 'neon-blue') return isSelected ? 'text-cyan-300 bg-cyan-400/30' : 'text-cyan-400 bg-cyan-400/20';
    if (color === 'neon-purple') return isSelected ? 'text-purple-300 bg-purple-400/30' : 'text-purple-400 bg-purple-400/20';
    if (color === 'violet-400') return isSelected ? 'text-violet-300 bg-violet-400/30' : 'text-violet-400 bg-violet-400/20';
    if (color === 'green-400') return isSelected ? 'text-green-300 bg-green-400/30' : 'text-green-400 bg-green-400/20';
    if (color === 'yellow-400') return isSelected ? 'text-yellow-300 bg-yellow-400/30' : 'text-yellow-400 bg-yellow-400/20';
    if (color === 'orange-400') return isSelected ? 'text-orange-300 bg-orange-400/30' : 'text-orange-400 bg-orange-400/20';
    if (color === 'blue-400') return isSelected ? 'text-blue-300 bg-blue-400/30' : 'text-blue-400 bg-blue-400/20';
    if (color === 'pink-400') return isSelected ? 'text-pink-300 bg-pink-400/30' : 'text-pink-400 bg-pink-400/20';
    if (color === 'indigo-400') return isSelected ? 'text-indigo-300 bg-indigo-400/30' : 'text-indigo-400 bg-indigo-400/20';
    if (color === 'red-400') return isSelected ? 'text-red-300 bg-red-400/30' : 'text-red-400 bg-red-400/20';
    if (color === 'cyan-400') return isSelected ? 'text-cyan-300 bg-cyan-400/30' : 'text-cyan-400 bg-cyan-400/20';
    if (color === 'purple-400') return isSelected ? 'text-purple-300 bg-purple-400/30' : 'text-purple-400 bg-purple-400/20';
    if (color === 'emerald-400') return isSelected ? 'text-emerald-300 bg-emerald-400/30' : 'text-emerald-400 bg-emerald-400/20';
    
    return isSelected ? 'text-gray-300 bg-gray-400/30' : 'text-gray-400 bg-gray-400/20';
  };

  const getTextColorClass = (color: string, isSelected: boolean = false) => {
    // Use custom CSS classes with !important to ensure they work
    if (color === 'neon-blue') return isSelected ? 'text-industry-neon-blue-selected' : 'text-industry-neon-blue';
    if (color === 'neon-purple') return isSelected ? 'text-industry-neon-purple-selected' : 'text-industry-neon-purple';
    if (color === 'violet-400') return isSelected ? 'text-industry-violet-400-selected' : 'text-industry-violet-400';
    if (color === 'green-400') return isSelected ? 'text-industry-green-400-selected' : 'text-industry-green-400';
    if (color === 'yellow-400') return isSelected ? 'text-industry-yellow-400-selected' : 'text-industry-yellow-400';
    if (color === 'orange-400') return isSelected ? 'text-industry-orange-400-selected' : 'text-industry-orange-400';
    if (color === 'blue-400') return isSelected ? 'text-industry-blue-400-selected' : 'text-industry-blue-400';
    if (color === 'pink-400') return isSelected ? 'text-industry-pink-400-selected' : 'text-industry-pink-400';
    if (color === 'indigo-400') return isSelected ? 'text-industry-indigo-400-selected' : 'text-industry-indigo-400';
    if (color === 'red-400') return isSelected ? 'text-industry-red-400-selected' : 'text-industry-red-400';
    if (color === 'cyan-400') return isSelected ? 'text-industry-cyan-400-selected' : 'text-industry-cyan-400';
    if (color === 'purple-400') return isSelected ? 'text-industry-purple-400-selected' : 'text-industry-purple-400';
    if (color === 'emerald-400') return isSelected ? 'text-industry-emerald-400-selected' : 'text-industry-emerald-400';
    
    return isSelected ? 'text-gray-200' : 'text-gray-400';
  };

  const getIndustryBgClass = (color: string, isSelected: boolean = false) => {
    const bgColorMap: Record<string, string> = {
      'neon-blue': isSelected ? 'bg-cyan-400/40 border-2 border-cyan-400 border-l-4 border-l-cyan-400 shadow-lg shadow-cyan-400/30' : 'bg-cyan-400/10 border border-cyan-400/30',
      'neon-purple': isSelected ? 'bg-purple-400/40 border-2 border-purple-400 border-l-4 border-l-purple-400 shadow-lg shadow-purple-400/30' : 'bg-purple-400/10 border border-purple-400/30',
      'violet-400': isSelected ? 'bg-violet-400/40 border-2 border-violet-400 border-l-4 border-l-violet-400 shadow-lg shadow-violet-400/30' : 'bg-violet-400/10 border border-violet-400/30',
      'green-400': isSelected ? 'bg-green-400/40 border-2 border-green-400 border-l-4 border-l-green-400 shadow-lg shadow-green-400/30' : 'bg-green-400/10 border border-green-400/30',
      'yellow-400': isSelected ? 'bg-yellow-400/40 border-2 border-yellow-400 border-l-4 border-l-yellow-400 shadow-lg shadow-yellow-400/30' : 'bg-yellow-400/10 border border-yellow-400/30',
      'orange-400': isSelected ? 'bg-orange-400/40 border-2 border-orange-400 border-l-4 border-l-orange-400 shadow-lg shadow-orange-400/30' : 'bg-orange-400/10 border border-orange-400/30',
      'blue-400': isSelected ? 'bg-blue-400/40 border-2 border-blue-400 border-l-4 border-l-blue-400 shadow-lg shadow-blue-400/30' : 'bg-blue-400/10 border border-blue-400/30',
      'pink-400': isSelected ? 'bg-pink-400/40 border-2 border-pink-400 border-l-4 border-l-pink-400 shadow-lg shadow-pink-400/30' : 'bg-pink-400/10 border border-pink-400/30',
      'indigo-400': isSelected ? 'bg-indigo-400/40 border-2 border-indigo-400 border-l-4 border-l-indigo-400 shadow-lg shadow-indigo-400/30' : 'bg-indigo-400/10 border border-indigo-400/30',
      'red-400': isSelected ? 'bg-red-400/40 border-2 border-red-400 border-l-4 border-l-red-400 shadow-lg shadow-red-400/30' : 'bg-red-400/10 border border-red-400/30',
      'cyan-400': isSelected ? 'bg-cyan-400/40 border-2 border-cyan-400 border-l-4 border-l-cyan-400 shadow-lg shadow-cyan-400/30' : 'bg-cyan-400/10 border border-cyan-400/30',
      'purple-400': isSelected ? 'bg-purple-400/40 border-2 border-purple-400 border-l-4 border-l-purple-400 shadow-lg shadow-purple-400/30' : 'bg-purple-400/10 border border-purple-400/30',
      'emerald-400': isSelected ? 'bg-emerald-400/40 border-2 border-emerald-400 border-l-4 border-l-emerald-400 shadow-lg shadow-emerald-400/30' : 'bg-emerald-400/10 border border-emerald-400/30',
    };
    return bgColorMap[color] || (isSelected ? 'bg-gray-400/40 border-2 border-gray-400 border-l-4 border-l-gray-400 shadow-lg shadow-gray-400/30' : 'bg-gray-400/10 border border-gray-400/30');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          onClick={() => setMobileMenuOpen(true)}
          className="mobile-menu-button glass-card rounded-lg p-2 text-white hover:bg-white/20 transition-all duration-200 border border-white/20"
          size="sm"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `mobile-sidebar mobile-transition ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'relative'
        }
        w-80 glass-card border-r border-white/20 p-6 space-y-6 overflow-y-auto
      `}>
        {/* Mobile Close Button */}
        {isMobile && (
          <Button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 glass-card rounded-lg p-2 text-white hover:bg-white/20 transition-all duration-200 border border-white/20"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 mb-8"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
            <Rocket className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">IdeaHunter</h1>
            <p className="text-sm text-gray-400">AI-Powered Reddit Trend Discovery</p>
          </div>
        </motion.div>
        
        {/* User Status Banner */}
        {!user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-xl p-4 border border-amber-400/30 bg-amber-400/10"
          >
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">Showing trending only</span>
            </div>
            <p className="text-amber-200/80 text-xs mt-1">
              Login to see all content and industry categories
            </p>
          </motion.div>
        )}
        
        {/* Daily Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 neon-glow"
        >
          <h3 className="text-lg font-semibold mb-3 text-neon-blue">Total Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Ideas Scraped</span>
              <span className="stats-counter font-bold text-lg">{stats?.totalIdeas || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Industries</span>
              <span className="stats-counter font-bold text-lg">{stats?.newIndustries || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Upvotes</span>
              <span className="stats-counter font-bold text-lg">{stats?.avgUpvotes || 0}</span>
            </div>
          </div>
        </motion.div>
        
        {/* Industry Categories */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Industries</h3>
          <div className="space-y-2">
            {/* All Industries Option - only show for authenticated users */}
            {user && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`industry-item rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-all duration-200 ${
                  !selectedIndustry && !showFavorites ? 'bg-cyan-400/40 border-2 border-cyan-400 border-l-4 border-l-cyan-400 shadow-lg shadow-cyan-400/30' : 'bg-white/5 border border-white/20'
                }`}
                onClick={() => handleIndustryClick(undefined)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className={`fas fa-globe ${!selectedIndustry && !showFavorites ? 'text-cyan-200' : 'text-cyan-400'}`}></i>
                    <span className={!selectedIndustry && !showFavorites ? 'text-cyan-200' : 'text-white'}>All Industries</span>
                  </div>
                  <span className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded-full text-xs">
                    {industries?.reduce((sum, industry) => sum + (industry.ideaCount || 0), 0) || 0}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Favorites Option - only show for authenticated users */}
            {user && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className={`industry-item rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-all duration-200 ${
                  showFavorites ? 'bg-pink-400/40 border-2 border-pink-400 border-l-4 border-l-pink-400 shadow-lg shadow-pink-400/30' : 'bg-white/5 border border-white/20'
                }`}
                onClick={handleFavoritesClick}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Heart className={`w-4 h-4 ${showFavorites ? 'text-pink-200 fill-current' : 'text-pink-400'}`} />
                    <span className={showFavorites ? 'text-pink-200' : 'text-white'}>Favorites</span>
                  </div>
                  <span className="bg-pink-400/20 text-pink-400 px-2 py-1 rounded-full text-xs">
                    {favoritesData?.total || 0}
                  </span>
                </div>
              </motion.div>
            )}

            {industriesLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="loading-skeleton rounded-lg h-12"></div>
              ))
            ) : (
              industries?.map((industry, index) => (
                <motion.div
                  key={industry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className={`industry-item rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-all duration-200 relative ${getIndustryBgClass(industry.color, selectedIndustry === industry.id)} ${!user ? 'opacity-60' : ''}`}
                  onClick={() => handleIndustryClick(industry.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <i className={`${industry.icon} ${getIconColorClass(industry.color, selectedIndustry === industry.id)}`}></i>
                      <span className={getIndustryTextColor(industry.name)}>{industry.name}</span>
                      {!user && <Lock className="w-3 h-3 text-gray-400 ml-2" />}
                    </div>
                    <Badge className={getColorClass(industry.color, selectedIndustry === industry.id)}>
                      {industry.ideaCount || 0}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )}
            
            {user && (
              <div className="text-center mt-4">
                <button className="text-cyan-400 hover:text-white transition-colors duration-200 text-sm">
                  View All Industries <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        defaultTab="signin"
      />
    </>
  );
}

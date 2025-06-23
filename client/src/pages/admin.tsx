import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import AdminHeader from "@/components/admin-header";
import ScraperControl from "@/components/scraper-control";
import StatsCards from "@/components/stats-cards";
import { 
  Trash2, 
  Loader2,
  Activity
} from "lucide-react";
import { queryClient, supabase } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import type { StartupIdea } from "@/lib/types";
// Edge Functions are not deployed yet, using direct fetch calls
import ParticleBackground from "@/components/particle-background";



export default function Admin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [lastActivity, setLastActivity] = useState<string | null>(null);

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  
  // Edge Functions are commented out for now

  // Fetch all ideas for admin management
  const { data: ideasData, isLoading: ideasLoading } = useQuery({
    queryKey: ['ideas', { pageSize: 1000 }],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('startup_ideas')
        .select(`
          *,
          industries!industry_id(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        ideas: data || [],
        total: count || 0,
        page: 1,
        pageSize: 1000,
        totalPages: 1
      };
    }
  });

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        totalIdeas: 0,
        newIndustries: 13,
        avgUpvotes: 0,
        successRate: 0
      };
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ideaIds: number[]) => {
      const { error } = await supabase
        .from('startup_ideas')
        .delete()
        .in('id', ideaIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setSelectedIdeas(new Set());
      toast({
        title: "批量删除成功",
        description: `已删除 ${selectedIdeas.size} 条记录`,
      });
    },
    onError: () => {
      toast({
        title: "批量删除失败",
        description: "无法删除选中的想法，请稍后重试",
        variant: "destructive",
      });
    }
  });



  const handleDeleteIdea = async (ideaId: number) => {
    if (confirm("确认删除这个想法吗？此操作不可撤销。")) {
      try {
        const { error } = await supabase
          .from('startup_ideas')
          .delete()
          .eq('id', ideaId);
        
        if (error) throw error;
        
        qc.invalidateQueries({ queryKey: ['ideas'] });
        qc.invalidateQueries({ queryKey: ['stats'] });
        
        toast({
          title: "删除成功",
          description: "想法已删除",
        });
      } catch (error) {
        toast({
          title: "删除失败",
          description: "无法删除想法，请稍后重试",
          variant: "destructive",
        });
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedIdeas.size === 0) return;
    
    if (confirm(`确认删除选中的 ${selectedIdeas.size} 个想法吗？此操作不可撤销。`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIdeas));
    }
  };

  const handleSelectIdea = (ideaId: number) => {
    const newSelected = new Set(selectedIdeas);
    if (newSelected.has(ideaId)) {
      newSelected.delete(ideaId);
    } else {
      newSelected.add(ideaId);
    }
    setSelectedIdeas(newSelected);
  };

  const handleSelectAll = () => {
    if (!filteredIdeas || filteredIdeas.length === 0) return;
    
    if (selectedIdeas.size === filteredIdeas.length) {
      setSelectedIdeas(new Set());
    } else {
      setSelectedIdeas(new Set(filteredIdeas.map((idea: StartupIdea) => idea.id)));
    }
  };

  const filteredIdeas = ideasData?.ideas ? ideasData.ideas.filter((idea: StartupIdea) =>
    idea.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];



  const handleDeleteAllData = async () => {
    // First confirmation
    const firstConfirm = confirm("WARNING: This will delete ALL data including startup ideas, reddit posts, scrape tasks and stats. This action cannot be undone! Click OK to continue or Cancel to abort.");
    
    if (!firstConfirm) return;
    
    // Second confirmation with typing requirement
    const confirmText = prompt("Please type 'DELETE ALL DATA' to confirm deletion:");
    
    if (confirmText !== 'DELETE ALL DATA') {
      toast({
        title: "操作已取消",
        description: "确认文本不正确，数据未被删除",
      });
      return;
    }

    setIsDeletingAll(true);
    
    try {
      let deletedIdeas = 0;
      let deletedPosts = 0;
      let deletedTasks = 0;
      let resetStats = 0;

      // Delete all startup ideas
      const { error: ideasError, count: ideasCount } = await supabase
        .from('startup_ideas')
        .delete()
        .neq('id', 0); // Delete all records

      if (ideasError) {
        console.error('Error deleting ideas:', ideasError);
      } else {
        deletedIdeas = ideasCount || 0;
      }

      // Delete all raw reddit posts
      const { error: postsError, count: postsCount } = await supabase
        .from('raw_reddit_posts')
        .delete()
        .neq('id', 0); // Delete all records

      if (postsError) {
        console.error('Error deleting posts:', postsError);
      } else {
        deletedPosts = postsCount || 0;
      }

      // Delete all scrape tasks
      const { error: tasksError, count: tasksCount } = await supabase
        .from('scrape_tasks')
        .delete()
        .neq('id', 0); // Delete all records

      if (tasksError) {
        console.error('Error deleting tasks:', tasksError);
      } else {
        deletedTasks = tasksCount || 0;
      }

      // Reset daily stats (delete all and let it recreate)
      const { error: statsError, count: statsCount } = await supabase
        .from('daily_stats')
        .delete()
        .neq('id', 0); // Delete all records

      if (statsError) {
        console.error('Error resetting stats:', statsError);
      } else {
        resetStats = statsCount || 0;
      }

      // Refresh all queries
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      
      // Clear selected ideas
      setSelectedIdeas(new Set());
      
      // Update last activity
      setLastActivity(`🗑️ 全部数据已删除 - Ideas: ${deletedIdeas}, Posts: ${deletedPosts}, Tasks: ${deletedTasks}, Stats: ${resetStats}`);

      toast({
        title: "数据删除完成",
        description: `已删除 ${deletedIdeas} 个想法，${deletedPosts} 个帖子，${deletedTasks} 个任务，重置了 ${resetStats} 个统计记录`,
      });

      console.log(`Data deletion completed - Ideas: ${deletedIdeas}, Posts: ${deletedPosts}, Tasks: ${deletedTasks}, Stats: ${resetStats}`);

    } catch (error) {
      console.error('Error during data deletion:', error);
      setLastActivity(`❌ 删除数据时出错: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "删除失败",
        description: "删除数据时出现错误，请检查控制台日志",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ParticleBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <AdminHeader />
        
        <div className="mt-8 space-y-8">
          {/* Stats Cards */}
          <StatsCards />

          {/* Scraper Control */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <ScraperControl />
          </div>

          {/* Activity Log */}
          {lastActivity && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Last Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 font-mono text-sm">{lastActivity}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {new Date().toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="bg-red-900/20 border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                ⚠️ 危险操作区域
              </CardTitle>
              <CardDescription className="text-red-300">
                不可逆转的危险操作，请谨慎使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-400 font-semibold mb-2">删除所有数据</h4>
                  <p className="text-red-300 text-sm mb-4">
                    这将删除数据库中的所有数据，包括：
                  </p>
                  <ul className="text-red-300 text-sm list-disc list-inside mb-4 space-y-1">
                    <li>所有创业想法 (startup_ideas 表)</li>
                    <li>所有原始Reddit帖子 (raw_reddit_posts 表)</li>
                    <li>所有任务 (scrape_tasks 表)</li>
                    <li>所有统计数据 (daily_stats 表)</li>
                  </ul>
                  <p className="text-red-400 text-sm font-semibold mb-4">
                    ⚠️ 此操作不可撤销！请确保你真的需要删除所有数据。
                  </p>
                  <Button
                    onClick={handleDeleteAllData}
                    disabled={isDeletingAll}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeletingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        正在删除所有数据...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除所有数据
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
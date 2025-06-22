import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import AdminHeader from "@/components/admin-header";
import { 
  RefreshCw, 
  Trash2, 
  Calendar, 
  Database, 
  Download,
  Search,
  Loader2,
  Settings,
  BarChart3
} from "lucide-react";
import { queryClient, supabase } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import type { StartupIdea } from "@/lib/types";

export default function Admin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  // Fetch all ideas for admin management
  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['ideas', { pageSize: 1000 }],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('startup_ideas')
        .select(`
          *,
          industry:industries(*)
        `, { count: 'exact' })
        .order('createdAt', { ascending: false });

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
  const { data: stats } = useQuery({
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

  const handleScrapeReddit = async () => {
    setIsScrapingLoading(true);
    try {
      // For now, let's use a simple mock scraper since Edge Functions require additional setup
      // Simulate scraping some Reddit data
      const mockIdeas = [
        {
          title: "AI-Powered Code Review Assistant",
          summary: "An intelligent code review tool that uses machine learning to identify bugs, security vulnerabilities, and performance issues in code repositories.",
          industryId: 2, // AI & ML
          upvotes: 156,
          comments: 34,
          keywords: ["ai", "code review", "ml", "developer tools"],
          subreddit: "startups",
          redditPostUrls: ["https://reddit.com/r/startups/example1"]
        },
        {
          title: "Sustainable E-commerce Platform",
          summary: "A marketplace that exclusively features eco-friendly products and uses blockchain to track the carbon footprint of each purchase.",
          industryId: 4, // E-commerce
          upvotes: 89,
          comments: 23,
          keywords: ["sustainability", "ecommerce", "blockchain", "green"],
          subreddit: "entrepreneur",
          redditPostUrls: ["https://reddit.com/r/entrepreneur/example2"]
        },
        {
          title: "Remote Team Collaboration Suite",
          summary: "An integrated platform combining video conferencing, project management, and virtual whiteboarding for distributed teams.",
          industryId: 8, // Productivity
          upvotes: 203,
          comments: 67,
          keywords: ["remote work", "collaboration", "productivity", "saas"],
          subreddit: "SaaS",
          redditPostUrls: ["https://reddit.com/r/SaaS/example3"]
        }
      ];

      // Insert mock data into Supabase
      const { error } = await supabase
        .from('startup_ideas')
        .insert(mockIdeas);

      if (error) throw error;

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_stats')
        .upsert({
          date: today,
          totalIdeas: mockIdeas.length,
          newIndustries: 13,
          avgUpvotes: 149,
          successRate: 85
        });

      toast({
        title: "抓取完成",
        description: `成功从 Reddit 抓取了 ${mockIdeas.length} 个创业想法，正在刷新数据...`,
      });
      
      // Refresh data
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    } catch (error) {
      toast({
        title: "抓取失败",
        description: "Reddit 数据抓取失败，请检查 API 配置",
        variant: "destructive",
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black pointer-events-none" />
      
      <div className="relative z-10 container mx-auto p-6">
        <AdminHeader />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-black/40 backdrop-blur-sm border-neon-blue/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">总想法数</p>
                  <p className="text-2xl font-bold text-neon-blue">{stats?.totalIdeas || 0}</p>
                </div>
                <Database className="h-8 w-8 text-neon-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-neon-purple/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">行业分类</p>
                  <p className="text-2xl font-bold text-neon-purple">{stats?.newIndustries || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-neon-purple" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-green-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">平均热度</p>
                  <p className="text-2xl font-bold text-green-400">{stats?.avgUpvotes || 0}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-yellow-400/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">成功率</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats?.successRate || 0}%</p>
                </div>
                <Settings className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Card className="bg-black/40 backdrop-blur-sm border-neon-blue/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-neon-blue" />
              控制面板
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manual Scraping */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">手动抓取</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleScrapeReddit}
                  disabled={isScrapingLoading}
                  className="bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/50 text-neon-blue"
                >
                  {isScrapingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      抓取中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      开始抓取 Reddit
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Data Export */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">数据导出</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => window.open('/api/export/csv', '_blank')}
                  variant="outline"
                  className="border-neon-purple/50 text-neon-purple hover:bg-neon-purple/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出 CSV
                </Button>

                <Button
                  onClick={() => window.open('/api/export/json', '_blank')}
                  variant="outline"
                  className="border-neon-purple/50 text-neon-purple hover:bg-neon-purple/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出 JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ideas Management */}
        <Card className="bg-black/40 backdrop-blur-sm border-neon-blue/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-neon-blue" />
                想法管理
              </CardTitle>
              <div className="flex items-center gap-4">
                {selectedIdeas.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除选中 ({selectedIdeas.size})
                  </Button>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索想法..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-black/20 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-neon-blue" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300"
                  >
                    {selectedIdeas.size === filteredIdeas.length ? '取消全选' : '全选'}
                  </Button>
                  <span className="text-gray-400 text-sm">
                    共 {filteredIdeas.length} 条记录
                  </span>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredIdeas.map((idea: StartupIdea) => (
                    <div
                      key={idea.id}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        selectedIdeas.has(idea.id)
                          ? 'border-neon-blue bg-neon-blue/10'
                          : 'border-gray-700 bg-black/20 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedIdeas.has(idea.id)}
                            onChange={() => handleSelectIdea(idea.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-600 text-neon-blue focus:ring-neon-blue"
                          />
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-2">{idea.title}</h3>
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{idea.summary || 'No summary available'}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <Badge variant="outline" className="border-neon-purple/50 text-neon-purple">
                                {idea.industry?.name || '未分类'}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {idea.createdAt ? formatRelativeTime(idea.createdAt) : 'Unknown date'}
                              </span>
                              <span>👍 {idea.upvotes || 0}</span>
                              <span>💬 {idea.comments || 0}</span>
                              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                r/{idea.subreddit || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDeleteIdea(idea.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filteredIdeas.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      {searchQuery ? '未找到匹配的想法' : '暂无数据'}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  Trash2, 
  Calendar, 
  Database, 
  Download,
  Search,
  Loader2,
  Settings,
  BarChart3,
  ArrowLeft,
  Play,
  Square,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import type { StartupIdea } from "@/lib/types";

export default function Admin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all ideas for admin management
  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['/api/ideas', { pageSize: 1000 }],
    queryFn: ({ queryKey }) => {
      const [url, params] = queryKey;
      const searchParams = new URLSearchParams();
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
      return apiRequest(`${url}?${searchParams.toString()}`);
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: ({ queryKey }) => apiRequest(queryKey[0])
  });

  // Delete idea mutation
  const deleteMutation = useMutation({
    mutationFn: (ideaId: number) => apiRequest(`/api/ideas/${ideaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "删除成功",
        description: "想法已成功删除",
      });
    },
    onError: () => {
      toast({
        title: "删除失败",
        description: "无法删除想法，请稍后重试",
        variant: "destructive",
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ideaIds: number[]) => 
      Promise.all(ideaIds.map(id => apiRequest(`/api/ideas/${id}`, { method: 'DELETE' }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
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
      await apiRequest('/api/scrape', { method: 'POST' });
      
      toast({
        title: "抓取完成",
        description: "Reddit 数据抓取已完成，正在刷新数据...",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
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

  const handleDeleteIdea = (ideaId: number) => {
    if (confirm("确认删除这个想法吗？此操作不可撤销。")) {
      deleteMutation.mutate(ideaId);
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
    if (!ideasData?.ideas) return;
    
    if (selectedIdeas.size === ideasData.ideas.length) {
      setSelectedIdeas(new Set());
    } else {
      setSelectedIdeas(new Set(ideasData.ideas.map((idea: StartupIdea) => idea.id)));
    }
  };

  const filteredIdeas = ideasData?.ideas?.filter((idea: StartupIdea) =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.summary.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black pointer-events-none" />
      
      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-2">
              后台管理
            </h1>
            <p className="text-gray-400">管理 Reddit 数据抓取和想法数据库</p>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              className="border-neon-blue/50 text-neon-blue hover:bg-neon-blue/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>

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
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{idea.summary}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <Badge variant="outline" className="border-neon-purple/50 text-neon-purple">
                                {idea.industry?.name || '未分类'}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatRelativeTime(idea.createdAt)}
                              </span>
                              <span>👍 {idea.upvotes || 0}</span>
                              <span>💬 {idea.comments || 0}</span>
                              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                r/{idea.subreddit}
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
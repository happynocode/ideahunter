import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { TaskStatusResponse, ScrapeTask } from "@/lib/types";

interface TaskMonitorProps {
  batchId?: string;
}

export default function TaskMonitor({ batchId }: TaskMonitorProps) {
  const [taskData, setTaskData] = useState<TaskStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchTaskStatus = async (targetBatchId?: string) => {
    if (!targetBatchId && !batchId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/status/${targetBatchId || batchId}`);
      if (response.ok) {
        const data = await response.json();
        setTaskData(data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch task status');
      }
    } catch (error) {
      console.error('Error fetching task status:', error);
      toast({
        title: "获取任务状态失败",
        description: "无法获取任务状态信息",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/retry/${taskId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "重试成功",
          description: "任务已重新启动",
        });
        // Refresh task status
        fetchTaskStatus();
      } else {
        throw new Error('Failed to retry task');
      }
    } catch (error) {
      toast({
        title: "重试失败",
        description: "无法重新启动任务",
        variant: "destructive",
      });
    }
  };

  // Auto refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || (!batchId && !taskData?.batchId)) return;
    
    const interval = setInterval(() => {
      fetchTaskStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, batchId, taskData?.batchId]);

  // Initial load
  useEffect(() => {
    if (batchId) {
      fetchTaskStatus();
    }
  }, [batchId]);

  const getStatusIcon = (status: ScrapeTask['status']) => {
    switch (status) {
      case 'pending_scrape':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'scraping':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'complete_scrape':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'analyzing':
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case 'complete_analysis':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ScrapeTask['status']) => {
    const statusConfig = {
      'pending_scrape': { variant: 'secondary' as const, text: '等待抓取' },
      'scraping': { variant: 'default' as const, text: '抓取中' },
      'complete_scrape': { variant: 'secondary' as const, text: '等待分析' },
      'analyzing': { variant: 'default' as const, text: '分析中' },
      'complete_analysis': { variant: 'default' as const, text: '已完成' },
      'failed': { variant: 'destructive' as const, text: '失败' },
    };
    
    const config = statusConfig[status] || { variant: 'secondary' as const, text: '未知' };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const calculateProgress = () => {
    if (!taskData) return 0;
    const { summary } = taskData;
    const completed = summary.complete_analysis;
    const total = summary.total;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const formatTimeRange = (timeRange: string) => {
    switch (timeRange) {
      case '24h': return '今日';
      case '7d': return '本周';
      case '30d': return '本月';
      default: return timeRange;
    }
  };

  if (!taskData && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            任务监控
          </CardTitle>
          <CardDescription>
            实时监控任务执行状态和进度
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无任务数据</p>
            <p className="text-sm">创建新的抓取任务后将显示监控信息</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              任务监控 - {taskData ? formatTimeRange(taskData.tasks[0]?.timeRange || '') : ''}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "停止自动刷新" : "启用自动刷新"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTaskStatus()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            批次ID: {taskData?.batchId.slice(0, 8)}... 
            {lastUpdated && (
              <span className="ml-2">
                更新时间: {lastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        {taskData && (
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>整体进度</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {taskData.summary.pending_scrape}
                </div>
                <div className="text-sm text-muted-foreground">等待抓取</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {taskData.summary.scraping}
                </div>
                <div className="text-sm text-muted-foreground">抓取中</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {taskData.summary.analyzing}
                </div>
                <div className="text-sm text-muted-foreground">分析中</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {taskData.summary.complete_analysis}
                </div>
                <div className="text-sm text-muted-foreground">已完成</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {taskData.summary.failed}
                </div>
                <div className="text-sm text-muted-foreground">失败</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {taskData.summary.total}
                </div>
                <div className="text-sm text-muted-foreground">总任务数</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Task Details Card */}
      {taskData && taskData.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>任务详情</CardTitle>
            <CardDescription>
              各行业任务的详细执行状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskData.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <div className="font-medium">
                        {task.industry?.name || `行业 ${task.industryId}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        任务 #{task.id} · 重试 {task.retryCount}/{task.maxRetries}
                      </div>
                      {task.postsScraped > 0 && (
                        <div className="text-sm text-muted-foreground">
                          已抓取: {task.postsScraped} · 已处理: {task.postsProcessed} · 生成想法: {task.ideasGenerated}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(task.status)}
                    
                    {task.status === 'failed' && task.retryCount < task.maxRetries && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryTask(task.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        重试
                      </Button>
                    )}
                    
                    {task.errorMessage && (
                      <div className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm truncate max-w-32" title={task.errorMessage}>
                          {task.errorMessage}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
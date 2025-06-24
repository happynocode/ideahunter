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
  const [autoRefresh, setAutoRefresh] = useState(false);
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
    const statusConfig: Record<ScrapeTask['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string }> = {
      'pending_scrape': { variant: 'secondary', text: 'Pending' },
      'scraping': { variant: 'default', text: 'Scraping' },
      'complete_scrape': { variant: 'default', text: 'Scraped' },
      'analyzing': { variant: 'default', text: 'Analyzing' },
      'complete_analysis': { variant: 'default', text: 'Complete' },
      'failed': { variant: 'destructive', text: 'Failed' },
    };
    
    const config = statusConfig[status] || { variant: 'secondary' as const, text: 'Unknown' };
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
      case '24h': return 'Today';
      case '7d': return 'This Week';
      case '30d': return 'This Month';
      default: return timeRange;
    }
  };

  if (!taskData && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Task Monitor
          </CardTitle>
          <CardDescription>
            Real-time monitoring of task execution status and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No task data available</p>
            <p className="text-sm">Monitoring information will be displayed after creating new scrape tasks</p>
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
              Task Monitor - {taskData ? formatTimeRange('24h') : ''}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "Stop Auto Refresh" : "Enable Auto Refresh"}
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
            Batch ID: {taskData?.batchId.slice(0, 8)}... 
            {lastUpdated && (
              <span className="ml-2">
                Updated: {lastUpdated.toLocaleTimeString('en-US')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        {taskData && (
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
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
                <div className="text-sm text-muted-foreground">Pending Scrape</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {taskData.summary.scraping}
                </div>
                <div className="text-sm text-muted-foreground">Scraping</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {taskData.summary.analyzing}
                </div>
                <div className="text-sm text-muted-foreground">Analyzing</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {taskData.summary.complete_analysis}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {taskData.summary.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {taskData.summary.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Task Details Card */}
      {taskData && taskData.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>
              Detailed execution status for each industry task
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
                        {task.industry?.name || `Industry ${task.industryId}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Task #{task.id} · Retries {task.retryCount}/{task.maxRetries}
                      </div>
                      {task.postsScraped > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Scraped: {task.postsScraped} · Processed: {task.postsProcessed} · Ideas Generated: {task.ideasGenerated}
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
                        Retry
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
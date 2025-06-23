import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Bot, Download, Loader2, Clock, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskBatch {
  batchId: string;
  tasksCreated: number;
  targetDate: string;
  createdAt: string;
}

export default function ScraperControl() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [recentBatches, setRecentBatches] = useState<TaskBatch[]>([]);
  const { toast } = useToast();

  const handleScraping = async () => {
    if (!selectedDate) {
      toast({
        title: "请选择日期",
        description: "请先选择要抓取和分析的日期",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    
    try {
      // 将选择的日期转换为YYYY-MM-DD格式
      const targetDate = format(selectedDate, 'yyyy-MM-dd');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-creator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetDate,
          forceCreate: false
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const newBatch: TaskBatch = {
          batchId: data.batchId,
          tasksCreated: data.tasksCreated,
          targetDate,
          createdAt: new Date().toISOString()
        };
        
        setRecentBatches(prev => [newBatch, ...prev.slice(0, 4)]);
        
        toast({
          title: "任务创建成功",
          description: `批次ID: ${data.batchId}，已创建 ${data.tasksCreated} 个任务。系统将自动处理 ${targetDate} 的Reddit数据。`,
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: "任务创建失败",
        description: error instanceof Error ? error.message : '请检查网络连接',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年MM月dd日');
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            日期选择
          </CardTitle>
          <CardDescription>
            选择要抓取和分析Reddit数据的日期
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">目标日期</label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "yyyy年MM月dd日") : "选择日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("2020-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                将抓取 {format(selectedDate, "yyyy年MM月dd日")} 发布的Reddit帖子
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Reddit 数据抓取与分析
          </CardTitle>
          <CardDescription>
            创建抓取任务，系统将自动分批处理并进行 AI 分析
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleScraping} 
            disabled={isRunning || !selectedDate}
            className="w-full"
            variant="default"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在创建抓取任务...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                创建抓取任务 ({selectedDate ? format(selectedDate, "MM月dd日") : "请选择日期"})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {recentBatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近创建的任务批次
            </CardTitle>
            <CardDescription>
              最近创建的抓取任务批次，系统正在自动处理
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBatches.map((batch) => (
                <div key={batch.batchId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">
                        {formatDate(batch.targetDate)} - {batch.tasksCreated} 个任务
                      </div>
                      <div className="text-sm text-muted-foreground">
                        批次ID: {batch.batchId.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(batch.createdAt)}
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
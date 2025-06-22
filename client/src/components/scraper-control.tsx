import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bot, Download, Loader2 } from "lucide-react";

export default function ScraperControl() {
  const [isTodayRunning, setIsTodayRunning] = useState(false);
  const [isWeekRunning, setIsWeekRunning] = useState(false);
  const [isMonthRunning, setIsMonthRunning] = useState(false);
  const { toast } = useToast();

  const handleScraping = async (timeRange: 'today' | 'week' | 'month') => {
    const setRunning = timeRange === 'today' ? setIsTodayRunning : 
                      timeRange === 'week' ? setIsWeekRunning : setIsMonthRunning;
    setRunning(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reddit-scraper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timeRange: timeRange === 'today' ? '24h' : timeRange === 'week' ? '7d' : '30d' 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const analyzerStatus = data.analyzerTriggered ? '（AI分析已自动启动）' : '（无新数据需要分析）';
        toast({
          title: "抓取成功",
          description: `${data.message} ${analyzerStatus}`,
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: "抓取失败",
        description: error instanceof Error ? error.message : '请检查网络连接',
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Reddit 数据抓取与分析
          </CardTitle>
          <CardDescription>
            从 Reddit 抓取数据并自动触发 AI 分析生成创业想法
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => handleScraping('today')} 
            disabled={isTodayRunning || isWeekRunning || isMonthRunning}
            className="w-full"
            variant="outline"
          >
            {isTodayRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取今日数据并启动分析...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                抓取今日数据 + AI 分析（每个子Reddit最多25条）
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => handleScraping('week')} 
            disabled={isTodayRunning || isWeekRunning || isMonthRunning}
            className="w-full"
            variant="outline"
          >
            {isWeekRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取本周数据并启动分析...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                抓取本周数据 + AI 分析（每个子Reddit最多100条）
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => handleScraping('month')} 
            disabled={isTodayRunning || isWeekRunning || isMonthRunning}
            className="w-full"
            variant="outline"
          >
            {isMonthRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取本月数据并启动分析...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                抓取本月数据 + AI 分析（每个子Reddit最多400条）
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bot, Download, Loader2, Sparkles } from "lucide-react";

export default function ScraperControl() {
  const [isTodayRunning, setIsTodayRunning] = useState(false);
  const [isWeekRunning, setIsWeekRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleScraping = async (timeRange: 'today' | 'week') => {
    const setRunning = timeRange === 'today' ? setIsTodayRunning : setIsWeekRunning;
    setRunning(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reddit-scraper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeRange }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "抓取成功",
          description: `${data.message} (${data.totalScraped} 条)`,
        });
        
        // 自动触发 AI 分析
        if (data.totalScraped > 0) {
          toast({
            title: "正在启动 AI 分析",
            description: "抓取完成，开始分析数据生成创业想法...",
          });
          handleAnalysis();
        }
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

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-analyzer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "分析完成",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: "分析失败",
        description: error instanceof Error ? error.message : '请检查 DeepSeek API 配置',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Reddit 数据抓取
          </CardTitle>
          <CardDescription>
            从 Reddit 抓取原始数据到数据库
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => handleScraping('today')} 
            disabled={isTodayRunning || isWeekRunning}
            className="w-full"
            variant="outline"
          >
            {isTodayRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取今日数据...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                抓取今日 Reddit 数据
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => handleScraping('week')} 
            disabled={isTodayRunning || isWeekRunning}
            className="w-full"
            variant="outline"
          >
            {isWeekRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取本周数据...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                抓取本周 Reddit 数据
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI 分析进行中
            </CardTitle>
            <CardDescription>
              DeepSeek AI 正在分析 Reddit 数据生成创业想法
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>AI 分析中，请稍候...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
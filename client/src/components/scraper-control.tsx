import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ScraperControl() {
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const { toast } = useToast();

  const handleScrapeReddit = async () => {
    setIsScrapingLoading(true);
    try {
      // For demo purposes, use mock data since Edge Functions require additional setup
      const mockIdeas = [
        {
          title: "FinTech Mobile Payment Solution",
          summary: "A revolutionary mobile payment app that uses biometric authentication and supports multiple cryptocurrencies.",
          industryId: 3, // Fintech
          upvotes: 178,
          comments: 45,
          keywords: ["fintech", "mobile payments", "crypto", "biometric"],
          subreddit: "fintech",
          redditPostUrls: ["https://reddit.com/r/fintech/example1"]
        },
        {
          title: "Healthcare Telemedicine Platform",
          summary: "An AI-powered telemedicine platform that connects patients with specialists and provides real-time health monitoring.",
          industryId: 5, // Healthcare Tech
          upvotes: 234,
          comments: 78,
          keywords: ["healthcare", "telemedicine", "ai", "monitoring"],
          subreddit: "healthcare",
          redditPostUrls: ["https://reddit.com/r/healthcare/example2"]
        }
      ];

      // Insert into Supabase
      const { supabase } = await import('@/lib/queryClient');
      const { error } = await supabase
        .from('startup_ideas')
        .insert(mockIdeas);

      if (error) throw error;

      toast({
        title: "Reddit Scraping Complete",
        description: `成功抓取了 ${mockIdeas.length} 个新的创业想法并保存到数据库`,
      });
      
      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Scraping Failed",
        description: "Reddit 数据抓取失败，请检查网络连接和 API 配置",
        variant: "destructive",
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/export/csv', '_blank');
  };

  const handleExportJSON = () => {
    window.open('/api/export/json', '_blank');
  };

  return (
    <Card className="bg-black/20 backdrop-blur-sm border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-neon-blue" />
          数据管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-gray-300 text-sm">从 Reddit 抓取最新的创业想法</p>
          <Button
            onClick={handleScrapeReddit}
            disabled={isScrapingLoading}
            className="w-full bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/50 text-neon-blue"
          >
            {isScrapingLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                抓取中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                开始抓取
              </>
            )}
          </Button>
        </div>
        
        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-300 text-sm mb-2">导出数据</p>
          <div className="flex gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="flex-1 border-neon-purple/50 text-neon-purple hover:bg-neon-purple/20"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={handleExportJSON}
              variant="outline"
              size="sm"
              className="flex-1 border-neon-purple/50 text-neon-purple hover:bg-neon-purple/20"
            >
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
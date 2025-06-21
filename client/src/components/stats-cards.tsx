import { motion } from "framer-motion";
import { TrendingUp, CheckCircle, BarChart3, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDailyStats } from "@/hooks/use-ideas";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCards() {
  const { data: stats, isLoading } = useDailyStats();

  const statsData = [
    {
      title: "Total Ideas",
      value: stats?.totalIdeas || 0,
      change: "+12% today",
      icon: BarChart3,
      changeColor: "text-green-400",
    },
    {
      title: "Industries",
      value: stats?.newIndustries || 0,
      change: "Active",
      icon: Target,
      changeColor: "text-cyan-400",
    },
    {
      title: "Avg Upvotes",
      value: stats?.avgUpvotes || 0,
      change: "Trending",
      icon: TrendingUp,
      changeColor: "text-yellow-400",
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      change: "Optimal",
      icon: CheckCircle,
      changeColor: "text-green-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 bg-white/10 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
    >
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`glass-card rounded-xl p-6 border-white/20 bg-transparent ${index === 0 ? 'neon-glow' : ''}`}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className="w-8 h-8 text-gray-400" />
                <div className="text-right">
                  <div className="text-2xl font-bold stats-counter">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.title}</div>
                </div>
              </div>
              <div className={`text-xs ${stat.changeColor} flex items-center`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

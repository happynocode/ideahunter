import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'upvotes' | 'comments' | 'recent';
  onSortChange: (sort: 'upvotes' | 'comments' | 'recent') => void;
  minUpvotes?: number;
  onMinUpvotesChange: (minUpvotes?: number) => void;
  timeRange: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  onTimeRangeChange: (timeRange: 'today' | 'yesterday' | 'week' | 'month' | 'all') => void;
}

export default function SearchFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  minUpvotes,
  onMinUpvotesChange,
  timeRange,
  onTimeRangeChange,
}: SearchFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="glass-card rounded-xl p-6 mb-8 neon-glow border-white/20 bg-transparent">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search ideas, keywords, or Reddit posts..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400 min-w-32">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={minUpvotes?.toString() || "all"}
                onValueChange={(value) => onMinUpvotesChange(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400 min-w-32">
                  <SelectValue placeholder="All Upvotes" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="all">All Upvotes</SelectItem>
                  <SelectItem value="5">5+ Upvotes</SelectItem>
                  <SelectItem value="10">10+ Upvotes</SelectItem>
                  <SelectItem value="50">50+ Upvotes</SelectItem>
                  <SelectItem value="100">100+ Upvotes</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400 min-w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="upvotes">Most Upvotes</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

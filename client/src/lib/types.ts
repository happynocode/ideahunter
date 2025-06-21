export interface Industry {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  ideaCount?: number;
}

export interface StartupIdea {
  id: number;
  title: string;
  summary: string;
  industryId: number;
  upvotes: number;
  comments: number;
  keywords: string[];
  subreddit: string;
  redditPostUrls: string[];
  existingSolutions?: string;
  solutionGaps?: string;
  marketSize?: string;
  createdAt: string;
  updatedAt: string;
  industry?: Industry;
}

export interface DailyStats {
  id: number;
  date: string;
  totalIdeas: number;
  newIndustries: number;
  avgUpvotes: number;
  successRate: number;
}

export interface IdeasResponse {
  ideas: StartupIdea[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

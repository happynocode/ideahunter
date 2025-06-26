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
  targetDate?: string; // YYYY-MM-DD format - the date this idea was based on
  createdAt: string;
  updatedAt: string;
  industry?: Industry;
  isFavorited?: boolean; // Add flag to track if current user has favorited this idea
}

export interface Favorite {
  id: number;
  userId: number;
  startupIdeaId: number;
  createdAt: string;
  startupIdea?: StartupIdea;
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
  isLimited?: boolean; // For non-authenticated users
}

// New types for task management
export interface ScrapeTask {
  id: number;
  industryId: number;
  targetDate: string; // YYYY-MM-DD format
  status: 'pending_scrape' | 'scraping' | 'complete_scrape' | 'analyzing' | 'complete_analysis' | 'failed';
  batchId: string;
  postsScraped: number;
  postsProcessed: number;
  ideasGenerated: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  industry?: Industry;
}

export interface TaskBatch {
  batchId: string;
  tasksCreated: number;
  targetDate: string; // YYYY-MM-DD format
  createdAt: string;
  tasks?: ScrapeTask[];
}

export interface TaskStatusResponse {
  batchId: string;
  tasks: ScrapeTask[];
  summary: {
    total: number;
    pending_scrape: number;
    scraping: number;
    complete_scrape: number;
    analyzing: number;
    complete_analysis: number;
    failed: number;
  };
}

export interface TaskHistoryResponse {
  batches: TaskBatch[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

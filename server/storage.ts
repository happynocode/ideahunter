import { users, industries, startupIdeas, dailyStats, type User, type InsertUser, type Industry, type InsertIndustry, type StartupIdea, type InsertStartupIdea, type DailyStats, type InsertDailyStats } from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, asc, and, gte, like, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getIndustries(): Promise<Industry[]>;
  getIndustryById(id: number): Promise<Industry | undefined>;
  createIndustry(industry: InsertIndustry): Promise<Industry>;
  
  getStartupIdeas(filters?: {
    industryId?: number;
    keywords?: string;
    minUpvotes?: number;
    sortBy?: 'upvotes' | 'comments' | 'recent';
    timeRange?: 'today' | 'week' | 'month' | 'all';
    page?: number;
    pageSize?: number;
  }): Promise<{ ideas: StartupIdea[]; total: number }>;
  getStartupIdeaById(id: number): Promise<StartupIdea | undefined>;
  createStartupIdea(idea: InsertStartupIdea): Promise<StartupIdea>;
  deleteStartupIdea(id: number): Promise<boolean>;
  
  getDailyStats(): Promise<DailyStats | undefined>;
  updateDailyStats(stats: InsertDailyStats): Promise<DailyStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private industries: Map<number, Industry>;
  private startupIdeas: Map<number, StartupIdea>;
  private dailyStats: DailyStats | undefined;
  private currentUserId: number;
  private currentIndustryId: number;
  private currentIdeaId: number;

  constructor() {
    this.users = new Map();
    this.industries = new Map();
    this.startupIdeas = new Map();
    this.currentUserId = 1;
    this.currentIndustryId = 1;
    this.currentIdeaId = 1;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize industries
    const industriesData: InsertIndustry[] = [
      { name: "SaaS & Cloud", slug: "saas", icon: "fas fa-cloud", color: "neon-blue", description: "Software as a Service and Cloud Computing" },
      { name: "AI & ML", slug: "ai", icon: "fas fa-brain", color: "neon-purple", description: "Artificial Intelligence and Machine Learning" },
      { name: "E-commerce", slug: "ecommerce", icon: "fas fa-shopping-cart", color: "violet-400", description: "Electronic Commerce and Retail" },
      { name: "Health & Fitness", slug: "health", icon: "fas fa-heart", color: "green-400", description: "Healthcare and Wellness" },
      { name: "FinTech", slug: "fintech", icon: "fas fa-chart-line", color: "yellow-400", description: "Financial Technology" },
      { name: "EdTech", slug: "edtech", icon: "fas fa-graduation-cap", color: "orange-400", description: "Educational Technology" },
      { name: "Developer Tools", slug: "devtools", icon: "fas fa-code", color: "blue-400", description: "Development Tools and Platforms" },
      { name: "Consumer Services", slug: "consumer", icon: "fas fa-users", color: "pink-400", description: "Consumer-facing Services" },
      { name: "Enterprise", slug: "enterprise", icon: "fas fa-building", color: "indigo-400", description: "Enterprise Solutions" },
      { name: "Media & Content", slug: "media", icon: "fas fa-play", color: "red-400", description: "Media and Content Creation" },
      { name: "Travel & Mobility", slug: "travel", icon: "fas fa-plane", color: "cyan-400", description: "Travel and Transportation" },
      { name: "Social & Community", slug: "social", icon: "fas fa-share-alt", color: "purple-400", description: "Social Platforms and Community Tools" },
      { name: "Sustainability", slug: "sustainability", icon: "fas fa-leaf", color: "emerald-400", description: "Green and Sustainable Solutions" },
    ];

    industriesData.forEach(industry => {
      this.createIndustry(industry);
    });

    // Initialize startup ideas with varied times
    const baseTime = new Date();
    const ideasData: InsertStartupIdea[] = [
      {
        title: "AI-Powered Code Review Assistant",
        summary: "Developers need better automated code review tools that understand context and provide meaningful suggestions, not just syntax checking.",
        industryId: 1, // SaaS & Cloud
        upvotes: 247,
        comments: 34,
        keywords: ["AI", "Code Review", "Developer Tools", "Automation"],
        subreddit: "r/programming",
        redditPostUrls: ["https://reddit.com/r/programming/post1", "https://reddit.com/r/webdev/post2"],
        existingSolutions: "SonarQube, CodeClimate, GitHub Copilot",
        solutionGaps: "Lack of business logic understanding and architectural pattern recognition",
        marketSize: "Developer Tools Market: $9.3B"
      },
      {
        title: "Personal Finance AI Coach",
        summary: "An AI that analyzes spending patterns and provides personalized financial advice, helping users save money and invest wisely.",
        industryId: 2, // AI & ML
        upvotes: 189,
        comments: 67,
        keywords: ["FinTech", "Personal Finance", "AI Assistant", "Investment"],
        subreddit: "r/PersonalFinance",
        redditPostUrls: ["https://reddit.com/r/PersonalFinance/post1"],
        existingSolutions: "Mint, YNAB, Personal Capital",
        solutionGaps: "Limited AI-driven insights and personalized recommendations",
        marketSize: "Personal Finance Software: $1.2B"
      },
      {
        title: "Remote Team Wellness Platform",
        summary: "A platform that helps remote teams stay healthy with virtual fitness challenges, mental health resources, and wellness tracking.",
        industryId: 4, // Health & Fitness
        upvotes: 156,
        comments: 43,
        keywords: ["Remote Work", "Wellness", "Team Building", "Mental Health"],
        subreddit: "r/remotework",
        redditPostUrls: ["https://reddit.com/r/remotework/post1"],
        existingSolutions: "Headspace for Work, Virgin Pulse",
        solutionGaps: "Remote-specific features and team collaboration",
        marketSize: "Corporate Wellness: $3.6B"
      },
      {
        title: "Sustainable Packaging Marketplace",
        summary: "A B2B marketplace connecting small businesses with eco-friendly packaging suppliers, making sustainable packaging affordable and accessible.",
        industryId: 3, // E-commerce
        upvotes: 134,
        comments: 28,
        keywords: ["Sustainability", "B2B", "Marketplace", "Packaging"],
        subreddit: "r/smallbusiness",
        redditPostUrls: ["https://reddit.com/r/smallbusiness/post1"],
        existingSolutions: "Alibaba, ThomasNet",
        solutionGaps: "Focus on sustainability and small business needs",
        marketSize: "B2B E-commerce: $12.2T"
      },
      {
        title: "Interactive Code Learning Platform",
        summary: "A platform that teaches programming through interactive storytelling and gamification, making coding education more engaging for beginners.",
        industryId: 6, // EdTech
        upvotes: 98,
        comments: 52,
        keywords: ["Education", "Programming", "Gamification", "Interactive"],
        subreddit: "r/learnprogramming",
        redditPostUrls: ["https://reddit.com/r/learnprogramming/post1"],
        existingSolutions: "Codecademy, freeCodeCamp, Khan Academy",
        solutionGaps: "Storytelling approach and advanced gamification",
        marketSize: "Online Education: $350B"
      },
      {
        title: "Micro-Investment Social Platform",
        summary: "A social platform where users can invest small amounts together in various assets, combining social features with micro-investing capabilities.",
        industryId: 5, // FinTech
        upvotes: 167,
        comments: 41,
        keywords: ["Investment", "Social", "Micro-finance", "Community"],
        subreddit: "r/investing",
        redditPostUrls: ["https://reddit.com/r/investing/post1"],
        existingSolutions: "Robinhood, Acorns, Stash",
        solutionGaps: "Social investing features and community-driven decisions",
        marketSize: "Investment Apps: $12B"
      }
    ];

    ideasData.forEach((idea, index) => {
      // Create ideas with different timestamps throughout the day
      const hoursAgo = index * 2 + Math.random() * 12; // Spread across 12+ hours
      const createdAt = new Date(baseTime.getTime() - hoursAgo * 60 * 60 * 1000);
      this.createStartupIdeaWithTime(idea, createdAt);
    });

    // Initialize daily stats
    this.dailyStats = {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      totalIdeas: 1247,
      newIndustries: 13,
      avgUpvotes: 156,
      successRate: 89
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getIndustries(): Promise<Industry[]> {
    return Array.from(this.industries.values());
  }

  async getIndustryById(id: number): Promise<Industry | undefined> {
    return this.industries.get(id);
  }

  async createIndustry(insertIndustry: InsertIndustry): Promise<Industry> {
    const id = this.currentIndustryId++;
    const industry: Industry = { 
      ...insertIndustry, 
      id,
      description: insertIndustry.description || null
    };
    this.industries.set(id, industry);
    return industry;
  }

  async getStartupIdeas(filters?: {
    industryId?: number;
    keywords?: string;
    minUpvotes?: number;
    sortBy?: 'upvotes' | 'comments' | 'recent';
    timeRange?: 'today' | 'week' | 'month' | 'all';
    page?: number;
    pageSize?: number;
  }): Promise<{ ideas: StartupIdea[]; total: number }> {
    let ideas = Array.from(this.startupIdeas.values());

    // Apply filters
    if (filters?.industryId) {
      ideas = ideas.filter(idea => idea.industryId === filters.industryId);
    }

    if (filters?.keywords) {
      const searchTerm = filters.keywords.toLowerCase();
      ideas = ideas.filter(idea => 
        idea.title.toLowerCase().includes(searchTerm) ||
        idea.summary.toLowerCase().includes(searchTerm) ||
        (idea.keywords || []).some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    }

    if (filters?.minUpvotes !== undefined) {
      ideas = ideas.filter(idea => (idea.upvotes || 0) >= filters.minUpvotes!);
    }

    // Apply time range filter
    if (filters?.timeRange && filters.timeRange !== 'all') {
      const now = new Date();
      let cutoffTime: Date;
      
      switch (filters.timeRange) {
        case 'today':
          cutoffTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffTime = new Date(0);
      }
      
      ideas = ideas.filter(idea => idea.createdAt && new Date(idea.createdAt) >= cutoffTime);
    }

    // Apply sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'upvotes':
          ideas.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
          break;
        case 'comments':
          ideas.sort((a, b) => (b.comments || 0) - (a.comments || 0));
          break;
        case 'recent':
          ideas.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
          break;
      }
    }

    const total = ideas.length;

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    ideas = ideas.slice(startIndex, endIndex);

    return { ideas, total };
  }

  async getStartupIdeaById(id: number): Promise<StartupIdea | undefined> {
    return this.startupIdeas.get(id);
  }

  async createStartupIdea(insertStartupIdea: InsertStartupIdea): Promise<StartupIdea> {
    const id = this.currentIdeaId++;
    const now = new Date();
    const startupIdea: StartupIdea = { 
      ...insertStartupIdea,
      id,
      upvotes: insertStartupIdea.upvotes || 0,
      comments: insertStartupIdea.comments || 0,
      keywords: Array.isArray(insertStartupIdea.keywords) ? insertStartupIdea.keywords : [],
      redditPostUrls: Array.isArray(insertStartupIdea.redditPostUrls) ? insertStartupIdea.redditPostUrls : [],
      createdAt: now,
      updatedAt: now
    };
    this.startupIdeas.set(id, startupIdea);
    return startupIdea;
  }

  private createStartupIdeaWithTime(insertStartupIdea: InsertStartupIdea, createdAt: Date): StartupIdea {
    const id = this.currentIdeaId++;
    const startupIdea: StartupIdea = { 
      ...insertStartupIdea,
      id,
      upvotes: insertStartupIdea.upvotes || 0,
      comments: insertStartupIdea.comments || 0,
      keywords: Array.isArray(insertStartupIdea.keywords) ? insertStartupIdea.keywords : [],
      redditPostUrls: Array.isArray(insertStartupIdea.redditPostUrls) ? insertStartupIdea.redditPostUrls : [],
      createdAt,
      updatedAt: createdAt
    };
    this.startupIdeas.set(id, startupIdea);
    return startupIdea;
  }

  async getDailyStats(): Promise<DailyStats | undefined> {
    return this.dailyStats;
  }

  async updateDailyStats(insertDailyStats: InsertDailyStats): Promise<DailyStats> {
    this.dailyStats = { 
      id: 1, 
      ...insertDailyStats,
      totalIdeas: insertDailyStats.totalIdeas || 0,
      newIndustries: insertDailyStats.newIndustries || 0,
      avgUpvotes: insertDailyStats.avgUpvotes || 0,
      successRate: insertDailyStats.successRate || 0
    };
    return this.dailyStats;
  }
}

// Remove the old DatabaseStorage implementation and use a simplified version
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  async getIndustries(): Promise<Industry[]> {
    return await this.db.select().from(industries).orderBy(asc(industries.name));
  }

  async getIndustryById(id: number): Promise<Industry | undefined> {
    const result = await this.db.select().from(industries).where(eq(industries.id, id)).limit(1);
    return result[0];
  }

  async createIndustry(industry: InsertIndustry): Promise<Industry> {
    const result = await this.db.insert(industries).values(industry).returning();
    return result[0];
  }

  async getStartupIdeas(filters?: {
    industryId?: number;
    keywords?: string;
    minUpvotes?: number;
    sortBy?: 'upvotes' | 'comments' | 'recent';
    timeRange?: 'today' | 'week' | 'month' | 'all';
    page?: number;
    pageSize?: number;
  }): Promise<{ ideas: StartupIdea[]; total: number }> {
    try {
      // Simplified query without complex filtering for now
      const allIdeas = await this.db.select().from(startupIdeas).orderBy(desc(startupIdeas.createdAt));
      
      let filteredIdeas = [...allIdeas];

      // Apply basic filters
      if (filters?.industryId) {
        filteredIdeas = filteredIdeas.filter(idea => idea.industryId === filters.industryId);
      }

      if (filters?.keywords) {
        const searchTerm = filters.keywords.toLowerCase();
        filteredIdeas = filteredIdeas.filter(idea => 
          idea.title.toLowerCase().includes(searchTerm) || 
          idea.summary.toLowerCase().includes(searchTerm)
        );
      }

      if (filters?.minUpvotes !== undefined) {
        filteredIdeas = filteredIdeas.filter(idea => (idea.upvotes || 0) >= filters.minUpvotes!);
      }

      // Apply time range filter
      if (filters?.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        let cutoffTime: Date;
        
        switch (filters.timeRange) {
          case 'today':
            cutoffTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffTime = new Date(0);
        }
        
        filteredIdeas = filteredIdeas.filter(idea => idea.createdAt && idea.createdAt >= cutoffTime);
      }

      // Apply sorting
      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'upvotes':
            filteredIdeas.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            break;
          case 'comments':
            filteredIdeas.sort((a, b) => (b.comments || 0) - (a.comments || 0));
            break;
          case 'recent':
            filteredIdeas.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
            break;
        }
      }

      const total = filteredIdeas.length;

      // Apply pagination
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const startIndex = (page - 1) * pageSize;
      const paginatedIdeas = filteredIdeas.slice(startIndex, startIndex + pageSize);

      return { ideas: paginatedIdeas, total };
    } catch (error) {
      console.error('Database query error:', error);
      return { ideas: [], total: 0 };
    }
  }

  async getStartupIdeaById(id: number): Promise<StartupIdea | undefined> {
    const result = await this.db.select().from(startupIdeas).where(eq(startupIdeas.id, id)).limit(1);
    return result[0];
  }

  async createStartupIdea(idea: InsertStartupIdea): Promise<StartupIdea> {
    try {
      const result = await this.db.insert(startupIdeas).values(idea).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating startup idea:', error);
      throw error;
    }
  }

  async getDailyStats(): Promise<DailyStats | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.select().from(dailyStats).where(eq(dailyStats.date, today)).limit(1);
    return result[0];
  }

  async updateDailyStats(stats: InsertDailyStats): Promise<DailyStats> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getDailyStats();
    
    if (existing) {
      const result = await this.db
        .update(dailyStats)
        .set(stats)
        .where(eq(dailyStats.date, today))
        .returning();
      return result[0];
    } else {
      const result = await this.db.insert(dailyStats).values({ ...stats, date: today }).returning();
      return result[0];
    }
  }

  async deleteStartupIdea(id: number): Promise<boolean> {
    try {
      await this.db.delete(startupIdeas).where(eq(startupIdeas.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting startup idea:', error);
      return false;
    }
  }

  // Initialize industries if they don't exist
  async initializeIndustries(): Promise<void> {
    const existingIndustries = await this.getIndustries();
    if (existingIndustries.length > 0) return;

    const industriesData: InsertIndustry[] = [
      { name: "SaaS & Cloud", slug: "saas", icon: "fas fa-cloud", color: "neon-blue", description: "Software as a Service and Cloud Computing" },
      { name: "AI & ML", slug: "ai", icon: "fas fa-brain", color: "neon-purple", description: "Artificial Intelligence and Machine Learning" },
      { name: "E-commerce", slug: "ecommerce", icon: "fas fa-shopping-cart", color: "violet-400", description: "Electronic Commerce and Retail" },
      { name: "Health & Fitness", slug: "health", icon: "fas fa-heart", color: "green-400", description: "Healthcare and Wellness" },
      { name: "FinTech", slug: "fintech", icon: "fas fa-chart-line", color: "yellow-400", description: "Financial Technology" },
      { name: "EdTech", slug: "edtech", icon: "fas fa-graduation-cap", color: "orange-400", description: "Educational Technology" },
      { name: "Developer Tools", slug: "devtools", icon: "fas fa-code", color: "blue-400", description: "Development Tools and Platforms" },
      { name: "Consumer Services", slug: "consumer", icon: "fas fa-users", color: "pink-400", description: "Consumer-facing Services" },
      { name: "Enterprise", slug: "enterprise", icon: "fas fa-building", color: "indigo-400", description: "Enterprise Solutions" },
      { name: "Media & Content", slug: "media", icon: "fas fa-play", color: "red-400", description: "Media and Content Creation" },
      { name: "Travel & Mobility", slug: "travel", icon: "fas fa-plane", color: "cyan-400", description: "Travel and Transportation" },
      { name: "Social & Community", slug: "social", icon: "fas fa-share-alt", color: "purple-400", description: "Social Platforms and Community Tools" },
      { name: "Sustainability", slug: "sustainability", icon: "fas fa-leaf", color: "emerald-400", description: "Green and Sustainable Solutions" },
    ];

    await this.db.insert(industries).values(industriesData);
  }
}

// Use database storage if available, otherwise memory storage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

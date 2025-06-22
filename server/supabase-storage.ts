import { createClient } from '@supabase/supabase-js';
import type { IStorage } from './storage.js';
import type { 
  User, InsertUser, 
  Industry, InsertIndustry, 
  StartupIdea, InsertStartupIdea,
  DailyStats, InsertDailyStats 
} from '../shared/schema.js';

export class SupabaseStorage implements IStorage {
  private supabase: ReturnType<typeof createClient>;

  constructor(url: string, anonKey: string) {
    this.supabase = createClient(url, anonKey);
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getIndustries(): Promise<Industry[]> {
    const { data, error } = await this.supabase
      .from('industries')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getIndustryById(id: number): Promise<Industry | undefined> {
    const { data } = await this.supabase
      .from('industries')
      .select('*')
      .eq('id', id)
      .single();
    return data || undefined;
  }

  async createIndustry(industry: InsertIndustry): Promise<Industry> {
    const { data, error } = await this.supabase
      .from('industries')
      .insert(industry)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    const { page = 1, pageSize = 20 } = filters || {};
    const offset = (page - 1) * pageSize;

    let query = this.supabase
      .from('startup_ideas')
      .select(`
        *,
        industry:industries!industry_id(*)
      `, { count: 'exact' });

    // Apply filters
    if (filters?.industryId) {
      query = query.eq('industryId', filters.industryId);
    }

    if (filters?.keywords) {
      query = query.or(`title.ilike.%${filters.keywords}%,summary.ilike.%${filters.keywords}%`);
    }

    if (filters?.minUpvotes) {
      query = query.gte('upvotes', filters.minUpvotes);
    }

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
          cutoffTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          cutoffTime = new Date(0);
      }
      
      query = query.gte('createdAt', cutoffTime.toISOString());
    }

    // Apply sorting
    switch (filters?.sortBy) {
      case 'upvotes':
        query = query.order('upvotes', { ascending: false });
        break;
      case 'comments':
        query = query.order('comments', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('createdAt', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      ideas: data || [],
      total: count || 0
    };
  }

  async getStartupIdeaById(id: number): Promise<StartupIdea | undefined> {
    const { data } = await this.supabase
      .from('startup_ideas')
      .select(`
        *,
        industry:industries!industry_id(*)
      `)
      .eq('id', id)
      .single();
    return data || undefined;
  }

  async createStartupIdea(idea: InsertStartupIdea): Promise<StartupIdea> {
    const { data, error } = await this.supabase
      .from('startup_ideas')
      .insert({
        ...idea,
        keywords: idea.keywords || [],
        redditPostUrls: idea.redditPostUrls || [],
        upvotes: idea.upvotes || 0,
        comments: idea.comments || 0
      })
      .select(`
        *,
        industry:industries!industry_id(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteStartupIdea(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('startup_ideas')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async getDailyStats(): Promise<DailyStats | undefined> {
    const { data } = await this.supabase
      .from('daily_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    return data || undefined;
  }

  async updateDailyStats(stats: InsertDailyStats): Promise<DailyStats> {
    const { data, error } = await this.supabase
      .from('daily_stats')
      .upsert({
        ...stats,
        date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async initializeIndustries(): Promise<void> {
    const industriesData = [
      { name: 'SaaS & Cloud', slug: 'saas', icon: '☁️', color: '#3b82f6', description: 'Software as a Service and cloud computing solutions' },
      { name: 'AI & Machine Learning', slug: 'ai-ml', icon: '🤖', color: '#8b5cf6', description: 'Artificial intelligence and machine learning applications' },
      { name: 'Fintech', slug: 'fintech', icon: '💰', color: '#10b981', description: 'Financial technology and digital banking solutions' },
      { name: 'E-commerce', slug: 'ecommerce', icon: '🛒', color: '#f59e0b', description: 'Online retail and marketplace platforms' },
      { name: 'Healthcare Tech', slug: 'healthtech', icon: '🏥', color: '#ef4444', description: 'Digital health and medical technology solutions' },
      { name: 'EdTech', slug: 'edtech', icon: '📚', color: '#06b6d4', description: 'Educational technology and online learning platforms' },
      { name: 'Developer Tools', slug: 'devtools', icon: '⚙️', color: '#6b7280', description: 'Software development tools and infrastructure' },
      { name: 'Productivity', slug: 'productivity', icon: '📈', color: '#84cc16', description: 'Workplace productivity and collaboration tools' },
      { name: 'Social & Community', slug: 'social', icon: '👥', color: '#ec4899', description: 'Social networks and community platforms' },
      { name: 'Gaming & Entertainment', slug: 'gaming', icon: '🎮', color: '#f97316', description: 'Gaming platforms and entertainment technology' },
      { name: 'Green Tech', slug: 'greentech', icon: '🌱', color: '#22c55e', description: 'Environmental and sustainability solutions' },
      { name: 'IoT & Hardware', slug: 'iot', icon: '📡', color: '#6366f1', description: 'Internet of Things and hardware innovations' },
      { name: 'Cybersecurity', slug: 'cybersecurity', icon: '🔒', color: '#dc2626', description: 'Security and privacy protection solutions' }
    ];

    try {
      await this.supabase
        .from('industries')
        .upsert(industriesData, { onConflict: 'slug' });
    } catch (error) {
      console.log('Industries already exist or error inserting:', error);
    }
  }
}
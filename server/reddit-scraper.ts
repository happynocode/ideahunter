import { storage } from "./storage";
import type { InsertStartupIdea } from "@shared/schema";

interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
  created_utc: number;
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

class RedditScraper {
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID!;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET!;
    this.userAgent = process.env.REDDIT_USER_AGENT!;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken!;
  }

  private async fetchSubredditPosts(subreddit: string, limit: number = 25): Promise<RedditPost[]> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.userAgent
      }
    });

    const data: RedditResponse = await response.json();
    return data.data.children.map(child => child.data);
  }

  private classifyIndustry(title: string, content: string): number {
    const text = (title + ' ' + content).toLowerCase();
    
    // AI & ML keywords
    if (text.includes('ai') || text.includes('artificial intelligence') || 
        text.includes('machine learning') || text.includes('ml') || 
        text.includes('neural network') || text.includes('deep learning')) {
      return 2; // AI & ML
    }
    
    // SaaS keywords
    if (text.includes('saas') || text.includes('software as a service') || 
        text.includes('cloud') || text.includes('platform') || text.includes('api')) {
      return 1; // SaaS & Cloud
    }
    
    // E-commerce keywords
    if (text.includes('ecommerce') || text.includes('e-commerce') || 
        text.includes('online store') || text.includes('marketplace') || 
        text.includes('shopping')) {
      return 3; // E-commerce
    }
    
    // FinTech keywords
    if (text.includes('fintech') || text.includes('payment') || 
        text.includes('crypto') || text.includes('blockchain') || 
        text.includes('finance') || text.includes('banking')) {
      return 5; // FinTech
    }
    
    // Health keywords
    if (text.includes('health') || text.includes('medical') || 
        text.includes('healthcare') || text.includes('fitness') || 
        text.includes('wellness')) {
      return 4; // Health & Fitness
    }
    
    // Default to SaaS
    return 1;
  }

  private extractKeywords(title: string, content: string): string[] {
    const text = (title + ' ' + content).toLowerCase();
    const keywords: Set<string> = new Set();
    
    // Technology keywords
    const techKeywords = ['ai', 'ml', 'saas', 'api', 'cloud', 'app', 'platform', 'software', 'digital', 'tech', 'automation', 'analytics'];
    const businessKeywords = ['startup', 'business', 'market', 'customer', 'revenue', 'growth', 'scale', 'monetize'];
    const industryKeywords = ['fintech', 'edtech', 'healthtech', 'ecommerce', 'marketplace', 'social', 'mobile'];
    
    [...techKeywords, ...businessKeywords, ...industryKeywords].forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    });
    
    return Array.from(keywords).slice(0, 10);
  }

  private generateSummary(title: string, content: string): string {
    // Simple summary generation - take first sentence or truncate content
    const text = content || title;
    const sentences = text.split(/[.!?]+/);
    
    if (sentences[0] && sentences[0].length > 50) {
      return sentences[0].trim() + '.';
    }
    
    return text.substring(0, 200).trim() + (text.length > 200 ? '...' : '');
  }

  async scrapeStartupIdeas(): Promise<void> {
    const subreddits = [
      'startups',
      'entrepreneur',
      'business',
      'SaaS',
      'technology',
      'artificial',
      'MachineLearning',
      'webdev',
      'programming',
      'fintech'
    ];

    console.log('Starting Reddit scraping...');

    for (const subreddit of subreddits) {
      try {
        console.log(`Scraping r/${subreddit}...`);
        const posts = await this.fetchSubredditPosts(subreddit, 10);
        
        for (const post of posts) {
          // Filter for startup/business related posts
          if (post.score < 5 || post.title.length < 10) continue;
          
          const idea: InsertStartupIdea = {
            title: post.title,
            summary: this.generateSummary(post.title, post.selftext),
            industryId: this.classifyIndustry(post.title, post.selftext),
            subreddit: subreddit,
            upvotes: post.score,
            comments: post.num_comments,
            keywords: this.extractKeywords(post.title, post.selftext),
            redditPostUrls: [`https://reddit.com${post.permalink}`]
          };

          try {
            await storage.createStartupIdea(idea);
            console.log(`Saved idea: ${post.title.substring(0, 50)}...`);
          } catch (error) {
            console.error(`Failed to save idea: ${error}`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error scraping r/${subreddit}:`, error);
      }
    }

    // Update daily stats
    try {
      const ideas = await storage.getStartupIdeas();
      await storage.updateDailyStats({
        totalIdeas: ideas.total,
        newIndustries: 13,
        avgUpvotes: Math.round(ideas.total > 0 ? ideas.ideas.reduce((sum, idea) => sum + (idea.upvotes || 0), 0) / ideas.total : 0),
        successRate: 85.2
      });
    } catch (error) {
      console.error('Failed to update daily stats:', error);
    }

    console.log('Reddit scraping completed!');
  }
}

export const redditScraper = new RedditScraper();
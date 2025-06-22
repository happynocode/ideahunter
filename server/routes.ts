import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { redditScraper } from "./reddit-scraper";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get industries
  app.get("/api/industries", async (req, res) => {
    try {
      const industries = await storage.getIndustries();
      
      // Get idea counts for each industry
      const industriesWithCounts = await Promise.all(
        industries.map(async (industry) => {
          const { total } = await storage.getStartupIdeas({ industryId: industry.id });
          return {
            ...industry,
            ideaCount: total
          };
        })
      );
      
      res.json(industriesWithCounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  // Get startup ideas with filters
  app.get("/api/ideas", async (req, res) => {
    try {
      const querySchema = z.object({
        industryId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        keywords: z.string().optional(),
        minUpvotes: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        sortBy: z.enum(['upvotes', 'comments', 'recent']).optional(),
        timeRange: z.enum(['today', 'week', 'month', 'all']).optional(),
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
      });

      const filters = querySchema.parse(req.query);
      const result = await storage.getStartupIdeas(filters);
      
      // Get industry names for ideas
      const ideasWithIndustries = await Promise.all(
        result.ideas.map(async (idea) => {
          const industry = await storage.getIndustryById(idea.industryId);
          return {
            ...idea,
            industry: industry || { name: "Unknown", slug: "unknown", color: "gray-400" }
          };
        })
      );

      res.json({
        ideas: ideasWithIndustries,
        total: result.total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(result.total / filters.pageSize)
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid query parameters" });
    }
  });

  // Get single idea by ID
  app.get("/api/ideas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.getStartupIdeaById(id);
      
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      const industry = await storage.getIndustryById(idea.industryId);
      
      res.json({
        ...idea,
        industry: industry || { name: "Unknown", slug: "unknown", color: "gray-400" }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch idea" });
    }
  });

  // Get daily stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDailyStats();
      if (!stats) {
        // Return default stats if none exist
        const defaultStats = {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          totalIdeas: 0,
          newIndustries: 13,
          avgUpvotes: 0,
          successRate: 85.2
        };
        return res.json(defaultStats);
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Reddit scraping endpoint
  app.post("/api/scrape", async (req, res) => {
    try {
      await redditScraper.scrapeStartupIdeas();
      res.json({ message: "Scraping completed successfully" });
    } catch (error) {
      console.error("Error during scraping:", error);
      res.status(500).json({ message: "Failed to scrape Reddit data" });
    }
  });

  // Export ideas as CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const { ideas } = await storage.getStartupIdeas({ pageSize: 1000 });
      
      const csvHeader = "ID,Title,Summary,Industry,Upvotes,Comments,Keywords,Subreddit,Created At\n";
      const csvRows = await Promise.all(
        ideas.map(async (idea) => {
          const industry = await storage.getIndustryById(idea.industryId);
          return [
            idea.id,
            `"${idea.title.replace(/"/g, '""')}"`,
            `"${idea.summary.replace(/"/g, '""')}"`,
            industry?.name || "Unknown",
            idea.upvotes,
            idea.comments,
            `"${(idea.keywords || []).join(', ')}"`,
            idea.subreddit,
            idea.createdAt?.toISOString() || ""
          ].join(",");
        })
      );
      
      const csv = csvHeader + csvRows.join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="startup-ideas.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Export ideas as JSON
  app.get("/api/export/json", async (req, res) => {
    try {
      const { ideas } = await storage.getStartupIdeas({ pageSize: 1000 });
      
      const exportData = await Promise.all(
        ideas.map(async (idea) => {
          const industry = await storage.getIndustryById(idea.industryId);
          return {
            ...idea,
            industry: industry?.name || "Unknown"
          };
        })
      );

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="startup-ideas.json"');
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export JSON" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

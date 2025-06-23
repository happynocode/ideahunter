import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { testDatabaseConnection } from "./test-db";
import { redditScraper } from "./reddit-scraper";
import { taskScheduler } from "./scheduler";
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
      const result = await taskScheduler.triggerManualScraping();
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error during scraping:", error);
      res.status(500).json({ message: "Failed to scrape Reddit data" });
    }
  });

  // Scheduler control endpoints
  app.post("/api/scheduler/start", async (req, res) => {
    try {
      taskScheduler.startDailyScrapingSchedule();
      res.json({ message: "Daily scraping scheduler started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start scheduler" });
    }
  });

  app.post("/api/scheduler/stop", async (req, res) => {
    try {
      taskScheduler.stopAllSchedules();
      res.json({ message: "All schedulers stopped" });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop scheduler" });
    }
  });

  // Delete idea endpoint
  app.delete("/api/ideas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.getStartupIdeaById(id);
      
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      const deleted = await storage.deleteStartupIdea(id);
      
      if (deleted) {
        res.json({ message: "Idea deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete idea" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete idea" });
    }
  });

  // Task Management API Routes
  
  // Get task status by batch ID
  app.get("/api/tasks/status/:batchId", async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const tasks = await storage.getTasksByBatchId(batchId);
      
      if (!tasks || tasks.length === 0) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // Get industry information for each task
      const tasksWithIndustries = await Promise.all(
        tasks.map(async (task) => {
          const industry = await storage.getIndustryById(task.industryId);
          return {
            ...task,
            industry: industry || { name: "Unknown", slug: "unknown", color: "gray-400" }
          };
        })
      );

      // Calculate summary statistics
      const summary = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        batchId,
        tasks: tasksWithIndustries,
        summary: {
          total: tasks.length,
          pending_scrape: summary.pending_scrape || 0,
          scraping: summary.scraping || 0,
          complete_scrape: summary.complete_scrape || 0,
          analyzing: summary.analyzing || 0,
          complete_analysis: summary.complete_analysis || 0,
          failed: summary.failed || 0,
        }
      });
    } catch (error) {
      console.error("Error fetching task status:", error);
      res.status(500).json({ message: "Failed to fetch task status" });
    }
  });

  // Get task history with pagination
  app.get("/api/tasks/history", async (req, res) => {
    try {
      const querySchema = z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
      });

      const { page, pageSize } = querySchema.parse(req.query);
      const result = await storage.getTaskHistory({ page, pageSize });
      
      res.json({
        batches: result.batches,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      });
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  // Retry failed task
  app.post("/api/tasks/retry/:taskId", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.status !== 'failed') {
        return res.status(400).json({ message: "Only failed tasks can be retried" });
      }

      if (task.retryCount >= task.maxRetries) {
        return res.status(400).json({ message: "Maximum retry attempts reached" });
      }

      // Reset task status to pending_scrape
      const updated = await storage.updateTaskStatus(taskId, {
        status: 'pending_scrape',
        retryCount: task.retryCount + 1,
        errorMessage: null,
        startedAt: null,
        completedAt: null
      });

      if (updated) {
        res.json({ message: "Task retry initiated successfully" });
      } else {
        res.status(500).json({ message: "Failed to retry task" });
      }
    } catch (error) {
      console.error("Error retrying task:", error);
      res.status(500).json({ message: "Failed to retry task" });
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

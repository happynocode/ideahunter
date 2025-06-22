import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  description: text("description"),
});

// Raw Reddit posts table - stores original scraped data
export const rawRedditPosts = pgTable("raw_reddit_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  author: text("author").notNull(),
  subreddit: text("subreddit").notNull(),
  upvotes: integer("upvotes").default(0),
  comments: integer("comments").default(0),
  permalink: text("permalink").notNull(),
  redditId: text("reddit_id").notNull().unique(),
  industryId: integer("industry_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  analyzed: boolean("analyzed").default(false),
  analyzedAt: timestamp("analyzed_at"),
});

// Processed startup ideas table - stores AI-analyzed results
export const startupIdeas = pgTable("startup_ideas", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  industryId: integer("industry_id").notNull(),
  upvotes: integer("upvotes").default(0),
  comments: integer("comments").default(0),
  keywords: json("keywords").$type<string[]>().default([]),
  subreddit: text("subreddit").notNull(),
  redditPostUrls: json("reddit_post_urls").$type<string[]>().default([]),
  existingSolutions: text("existing_solutions"),
  solutionGaps: text("solution_gaps"),
  marketSize: text("market_size"),
  confidenceScore: integer("confidence_score").default(0).notNull(),
  sourcePostIds: json("source_post_ids").$type<number[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyStats = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  totalIdeas: integer("total_ideas").default(0),
  newIndustries: integer("new_industries").default(0),
  avgUpvotes: integer("avg_upvotes").default(0),
  successRate: integer("success_rate").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertIndustrySchema = createInsertSchema(industries).omit({
  id: true,
});

export const insertRawRedditPostSchema = createInsertSchema(rawRedditPosts).omit({
  id: true,
  createdAt: true,
  scrapedAt: true,
});

export const insertStartupIdeaSchema = createInsertSchema(startupIdeas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type RawRedditPost = typeof rawRedditPosts.$inferSelect;
export type InsertRawRedditPost = z.infer<typeof insertRawRedditPostSchema>;
export type StartupIdea = typeof startupIdeas.$inferSelect;
export type InsertStartupIdea = z.infer<typeof insertStartupIdeaSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;

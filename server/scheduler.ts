import { redditScraper } from "./reddit-scraper";

class TaskScheduler {
  private intervals: NodeJS.Timeout[] = [];

  startDailyScrapingSchedule() {
    // Run scraping every 24 hours (86400000 ms)
    const dailyInterval = setInterval(async () => {
      console.log('Starting scheduled Reddit scraping...');
      try {
        await redditScraper.scrapeStartupIdeas();
        console.log('Scheduled scraping completed successfully');
      } catch (error) {
        console.error('Scheduled scraping failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.intervals.push(dailyInterval);
    console.log('Daily Reddit scraping scheduler started');
  }

  startHourlyScrapingSchedule() {
    // Run light scraping every hour for popular subreddits
    const hourlyInterval = setInterval(async () => {
      console.log('Starting hourly light scraping...');
      try {
        // Scrape fewer posts more frequently from key subreddits
        const popularSubreddits = ['startups', 'entrepreneur', 'SaaS'];
        for (const subreddit of popularSubreddits) {
          // This would need to be implemented in the scraper
          console.log(`Light scraping r/${subreddit}...`);
        }
      } catch (error) {
        console.error('Hourly scraping failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.push(hourlyInterval);
    console.log('Hourly Reddit scraping scheduler started');
  }

  stopAllSchedules() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('All scraping schedules stopped');
  }

  // Manual trigger for testing
  async triggerManualScraping() {
    console.log('Manual scraping triggered...');
    try {
      await redditScraper.scrapeStartupIdeas();
      console.log('Manual scraping completed');
      return { success: true, message: 'Scraping completed successfully' };
    } catch (error) {
      console.error('Manual scraping failed:', error);
      return { success: false, message: 'Scraping failed: ' + error };
    }
  }
}

export const taskScheduler = new TaskScheduler();
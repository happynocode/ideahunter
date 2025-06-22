# Supabase Edge Function Deployment Guide

## Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`

## Deployment Steps

1. **Initialize Supabase project (if not done):**
   ```bash
   supabase init
   ```

2. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   To find your project ref:
   - Go to your Supabase dashboard
   - Your project URL is: `https://YOUR_PROJECT_REF.supabase.co`
   - Use the part before `.supabase.co` as your project ref

3. **Deploy the Reddit Scraper function:**
   ```bash
   supabase functions deploy reddit-scraper
   ```

4. **Set required environment variables:**
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   Get your service role key from:
   - Supabase Dashboard → Settings → API → service_role key

## Function Details

**Function Name:** `reddit-scraper`
**Endpoint:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/reddit-scraper`

**What it does:**
- Scrapes multiple Reddit subreddits for startup ideas
- Filters posts based on upvotes (≥5) and comments (≥2)
- Classifies ideas by industry
- Extracts keywords and generates summaries
- Stores data in your Supabase database
- Updates daily statistics

**Targeted Subreddits:**
- entrepreneur, startups, business, smallbusiness
- SaaS, technology, webdev, Programming
- fintech, ecommerce, healthtech, edtech
- startup_ideas, businessideas, innovation

## Testing

After deployment, test the function:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/reddit-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Scheduling (Optional)

To run daily at midnight UTC, set up a cron job or use Supabase's scheduled functions.

## Database Setup

Ensure your database has the correct schema by running the SQL setup:

```sql
-- This should already be done, but verify the tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('startup_ideas', 'industries', 'daily_stats');
```
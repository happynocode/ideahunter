# Reddit API Trending Functionality Research

## 📊 Overview

This document summarizes research on Reddit API endpoints for discovering trending subreddits and integrating them into our "General" industry category for dynamic content discovery.

## 🔍 Reddit API Endpoints Explored

### Available Endpoints
1. **`/subreddits/popular`** - Most subscribed subreddits
   - Returns subreddits sorted by subscriber count
   - Good for finding established popular communities
   - Best for stable, high-quality content sources

2. **`/subreddits/new`** - Recently created subreddits
   - Shows newest subreddits on the platform
   - Can help identify emerging communities
   - Higher risk of low-quality or inactive subreddits

3. **`/subreddits/default`** - Default subreddits
   - Traditional "front page" subreddits
   - High quality and moderation standards
   - Safe choices for general content

4. **`/r/all/hot`** - Trending posts across all subreddits
   - Shows currently hot posts from all subreddits
   - Good for identifying which subreddits have viral content
   - Can help discover active communities

5. **`/r/all/rising`** - Rising posts across all subreddits
   - Shows posts gaining momentum
   - Early indicator of trending content
   - Useful for catching viral content early

## ⚠️ Key Findings

### What Reddit API Does NOT Have
- **No dedicated "trending subreddits" endpoint**
- No specific API for subreddit popularity changes over time
- No API for community growth rate metrics
- No real-time trending community discovery

### What We CAN Do
- Use `/subreddits/popular` for stable popular communities
- Monitor `/r/all/hot` and `/r/all/rising` to identify active subreddits
- Track which subreddits appear frequently in trending posts
- Use subscriber count as a proxy for popularity

## 🎯 Implementation Recommendations

### For General Category Enhancement
1. **Static Popular Subreddits** (Already implemented)
   - r/AskReddit, r/funny, r/gaming, r/worldnews, etc.
   - Based on subscriber counts and general appeal

2. **Dynamic Discovery Strategy**
   - Run weekly discovery jobs using `/subreddits/popular`
   - Monitor `/r/all/hot` to identify active subreddits
   - Filter results to exclude NSFW, low-quality, or specialized content
   - Update general category subreddit list periodically

3. **Quality Filters**
   - Minimum subscriber threshold (10,000+)
   - English language preference
   - Exclude NSFW content
   - Avoid niche or specialized communities
   - Require meaningful public description

## 🏗️ Architecture Integration

### Edge Function: reddit-trending-discovery
- **Purpose**: Research and discover trending subreddits
- **Endpoints**: 
  - `/subreddits/popular`
  - `/subreddits/new` 
  - `/subreddits/default`
- **Output**: Filtered list of quality subreddits for general category
- **Schedule**: Can be run manually or scheduled weekly

### Integration with Existing System
- New general category added with ID: 240
- Contains 22 popular subreddits including requested r/AskReddit and r/IAMA
- Can be expanded dynamically using trending discovery function

## 📈 Popular Subreddits Added to General Category

Based on research, we've added these subreddits to the general category:

| Subreddit | Estimated Subscribers | Content Type |
|-----------|----------------------|--------------|
| r/AskReddit | 55M | Q&A, Discussion |
| r/funny | 67M | Humor, Memes |
| r/gaming | 47M | Gaming Discussion |
| r/worldnews | 46M | Current Events |
| r/todayilearned | 41M | Facts, Learning |
| r/aww | 38M | Cute Content |
| r/Music | 38M | Music Discussion |
| r/movies | 36M | Film Discussion |
| r/memes | 36M | Internet Humor |
| r/Showerthoughts | 34M | Random Thoughts |
| r/science | 34M | Scientific Content |
| r/pics | 33M | Photography |
| r/Jokes | 31M | Humor |
| r/news | 30M | Current Events |
| r/explainlikeimfive | 22M | Educational |
| r/books | 19M | Literature |
| r/food | 18M | Cooking, Recipes |
| r/LifeProTips | 22M | Advice |
| r/DIY | 20M | Crafts, Projects |
| r/GetMotivated | 16M | Motivation |
| r/askscience | 18M | Science Q&A |
| r/IAMA | 20M | Interviews |

## 🔄 Future Enhancements

1. **Automated Discovery Pipeline**
   - Schedule weekly runs of trending discovery
   - Automatically suggest new subreddits for general category
   - Track subreddit growth metrics over time

2. **Content Quality Metrics**
   - Monitor post engagement rates from different subreddits
   - Adjust subreddit selection based on startup idea generation success
   - Remove underperforming subreddits from rotation

3. **Seasonal/Event-Based Discovery**
   - Detect trending topics and events
   - Temporarily add relevant subreddits during viral events
   - Return to baseline after event passes

## 🚀 Implementation Status

- ✅ General category created with ID 240
- ✅ 22 popular subreddits added to INDUSTRY_MAPPING
- ✅ Documentation updated (26 industries total)
- ✅ Trending discovery Edge Function created
- ⏳ Function deployment (user will handle)
- ⏳ Testing and validation
- ⏳ Integration with daily scraping pipeline

## 📝 Notes

The current implementation provides a solid foundation for general content discovery while the trending discovery function offers future expansion capabilities. The lack of a dedicated Reddit trending API means we rely on popularity metrics and manual curation for the best results. 
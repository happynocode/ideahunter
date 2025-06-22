-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create industries table
CREATE TABLE IF NOT EXISTS industries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(255),
  color VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create raw_reddit_posts table - stores original scraped data
CREATE TABLE IF NOT EXISTS raw_reddit_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  author VARCHAR(255) NOT NULL,
  subreddit VARCHAR(255) NOT NULL,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  permalink VARCHAR(500) NOT NULL,
  reddit_id VARCHAR(255) NOT NULL UNIQUE,
  industry_id INTEGER REFERENCES industries(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create startup_ideas table - stores AI-analyzed results
CREATE TABLE IF NOT EXISTS startup_ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  industry_id INTEGER REFERENCES industries(id),
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  subreddit VARCHAR(255),
  reddit_post_urls TEXT[] DEFAULT '{}',
  existing_solutions TEXT,
  solution_gaps TEXT,
  market_size TEXT,
  confidence_score INTEGER DEFAULT 0,
  source_post_ids INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_ideas INTEGER DEFAULT 0,
  new_industries INTEGER DEFAULT 0,
  avg_upvotes INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 20 detailed industries based on PRD
INSERT INTO industries (name, slug, icon, color, description) VALUES
('SaaS & 云服务', 'saas-cloud', '☁️', '#3b82f6', 'Software as a Service and cloud computing solutions'),
('开发者工具 & 平台', 'dev-tools', '⚙️', '#6b7280', 'Software development tools and platforms'),
('API & 后端服务', 'api-backend', '🔗', '#8b5cf6', 'API development and backend services'),
('移动应用开发', 'mobile-dev', '📱', '#10b981', 'Mobile application development'),
('Web & 前端开发', 'web-frontend', '🌐', '#06b6d4', 'Web and frontend development'),
('低/无代码平台', 'nocode-lowcode', '🚀', '#84cc16', 'No-code and low-code automation platforms'),
('网络安全 & 隐私', 'cybersecurity', '🔒', '#dc2626', 'Cybersecurity and privacy protection'),
('AI & 机器学习', 'ai-ml', '🤖', '#8b5cf6', 'Artificial intelligence and machine learning'),
('电商 & 零售', 'ecommerce', '🛒', '#f59e0b', 'E-commerce and retail platforms'),
('健康 & 健身科技', 'healthtech', '🏥', '#ef4444', 'Healthcare and fitness technology'),
('教育科技', 'edtech', '📚', '#06b6d4', 'Educational technology platforms'),
('金融科技', 'fintech', '💰', '#10b981', 'Financial technology and digital banking'),
('消费者服务', 'consumer-services', '🏠', '#f97316', 'Consumer and local services'),
('企业服务 & B2B', 'b2b-enterprise', '🏢', '#6366f1', 'Enterprise and B2B services'),
('媒体 & 内容创作', 'media-content', '🎨', '#ec4899', 'Media and content creation platforms'),
('旅游 & 出行', 'travel-transport', '✈️', '#22c55e', 'Travel and transportation services'),
('社交 & 社区', 'social-community', '👥', '#ec4899', 'Social networks and community platforms'),
('绿色 & 可持续科技', 'greentech-sustainability', '🌱', '#22c55e', 'Green technology and sustainability solutions'),
('物流 & 供应链', 'logistics-supply', '📦', '#64748b', 'Logistics and supply chain management'),
('游戏 & 娱乐', 'gaming-entertainment', '🎮', '#f97316', 'Gaming and entertainment platforms')
ON CONFLICT (slug) DO NOTHING;

-- Add missing columns if they don't exist (for existing databases)
DO $$ 
BEGIN
    -- Add confidence_score if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'startup_ideas' AND column_name = 'confidence_score') THEN
        ALTER TABLE startup_ideas ADD COLUMN confidence_score INTEGER DEFAULT 0;
    END IF;
    
    -- Add source_post_ids if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'startup_ideas' AND column_name = 'source_post_ids') THEN
        ALTER TABLE startup_ideas ADD COLUMN source_post_ids INTEGER[] DEFAULT '{}';
    END IF;
END $$;

-- Create RLS policies
ALTER TABLE startup_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_reddit_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on startup_ideas" ON startup_ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access on industries" ON industries FOR SELECT USING (true);
CREATE POLICY "Allow public read access on daily_stats" ON daily_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access on raw_reddit_posts" ON raw_reddit_posts FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on startup_ideas" ON startup_ideas FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on industries" ON industries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on daily_stats" ON daily_stats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on raw_reddit_posts" ON raw_reddit_posts FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_startup_ideas_industry_id ON startup_ideas(industry_id);
CREATE INDEX IF NOT EXISTS idx_startup_ideas_created_at ON startup_ideas(created_at);
CREATE INDEX IF NOT EXISTS idx_startup_ideas_upvotes ON startup_ideas(upvotes);
CREATE INDEX IF NOT EXISTS idx_startup_ideas_confidence_score ON startup_ideas(confidence_score);
CREATE INDEX IF NOT EXISTS idx_raw_reddit_posts_industry_id ON raw_reddit_posts(industry_id);
CREATE INDEX IF NOT EXISTS idx_raw_reddit_posts_created_at ON raw_reddit_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_reddit_posts_reddit_id ON raw_reddit_posts(reddit_id);
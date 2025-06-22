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

-- Create startup_ideas table
CREATE TABLE IF NOT EXISTS startup_ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  "industryId" INTEGER REFERENCES industries(id),
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  subreddit VARCHAR(255),
  "redditPostUrls" TEXT[] DEFAULT '{}',
  "existingSolutions" TEXT,
  "solutionGaps" TEXT,
  "marketSize" TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  "totalIdeas" INTEGER DEFAULT 0,
  "newIndustries" INTEGER DEFAULT 0,
  "avgUpvotes" INTEGER DEFAULT 0,
  "successRate" DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default industries
INSERT INTO industries (name, slug, icon, color, description) VALUES
('SaaS & Cloud', 'saas', '☁️', '#3b82f6', 'Software as a Service and cloud computing solutions'),
('AI & Machine Learning', 'ai-ml', '🤖', '#8b5cf6', 'Artificial intelligence and machine learning applications'),
('Fintech', 'fintech', '💰', '#10b981', 'Financial technology and digital banking solutions'),
('E-commerce', 'ecommerce', '🛒', '#f59e0b', 'Online retail and marketplace platforms'),
('Healthcare Tech', 'healthtech', '🏥', '#ef4444', 'Digital health and medical technology solutions'),
('EdTech', 'edtech', '📚', '#06b6d4', 'Educational technology and online learning platforms'),
('Developer Tools', 'devtools', '⚙️', '#6b7280', 'Software development tools and infrastructure'),
('Productivity', 'productivity', '📈', '#84cc16', 'Workplace productivity and collaboration tools'),
('Social & Community', 'social', '👥', '#ec4899', 'Social networks and community platforms'),
('Gaming & Entertainment', 'gaming', '🎮', '#f97316', 'Gaming platforms and entertainment technology'),
('Green Tech', 'greentech', '🌱', '#22c55e', 'Environmental and sustainability solutions'),
('IoT & Hardware', 'iot', '📡', '#6366f1', 'Internet of Things and hardware innovations'),
('Cybersecurity', 'cybersecurity', '🔒', '#dc2626', 'Security and privacy protection solutions')
ON CONFLICT (slug) DO NOTHING;

-- Create RLS policies
ALTER TABLE startup_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on startup_ideas" ON startup_ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read access on industries" ON industries FOR SELECT USING (true);
CREATE POLICY "Allow public read access on daily_stats" ON daily_stats FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on startup_ideas" ON startup_ideas FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on industries" ON industries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on daily_stats" ON daily_stats FOR ALL USING (auth.role() = 'service_role');
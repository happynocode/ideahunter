# 🚀 IdeaHunter - AI-Powered Reddit Trend Discovery

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://happynocode.github.io/reddit-idea-scraper)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.io/)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-purple)](https://vitejs.dev/)

> An AI-powered Reddit startup ideas scraper and analysis platform designed to discover and analyze trending entrepreneurial opportunities from Reddit communities.

## 🎯 Project Overview

IdeaHunter is a full-stack web application that scrapes trending posts from Reddit and uses AI analysis to provide valuable market insights and business opportunities for entrepreneurs. The project adopts a distributed architecture supporting multi-industry concurrent processing to ensure efficient data collection and analysis.

### ✨ Core Features

- 🔍 **Intelligent Scraping System** - Automatically scrapes trending Reddit posts across 31 industries
- 🤖 **AI-Driven Analysis** - Uses DeepSeek AI for startup idea extraction and analysis
- 📊 **Visualization Dashboard** - Modern React frontend interface
- 🎛️ **Admin Panel** - Complete scraper control and monitoring system
- 📈 **Data Export** - Supports CSV/JSON format exports
- 🔐 **User Authentication** - Secure user management system

### 🏗️ Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │    │   Express API    │    │  Supabase       │
│                 │    │                  │    │                 │
│ • Dashboard     │◄──►│ • Data API       │◄──►│ • Database      │
│ • Authentication│    │ • User Auth      │    │ • Edge Functions│
│ • Data Viz      │    │ • File Service   │    │ • Real-time Sub │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌────────────────┐
                       │ Distributed    │
                       │ Scraper System │
                       │ • Task Creator │
                       │ • Coordinator  │
                       │ • Reddit Bot   │
                       │ • Analyzer     │
                       │ • AI Processor │
                       └────────────────┘
```

## 🛠️ Tech Stack

### Frontend (Client)
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI component library
- **Framer Motion** - Animation library
- **React Query** - Data fetching and state management
- **Wouter** - Lightweight routing library

### Backend (Server)
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe development
- **Drizzle ORM** - Modern TypeScript ORM
- **Supabase** - Backend-as-a-Service platform

### Database & Storage
- **PostgreSQL** - Primary database
- **Supabase** - Database hosting and API
- **Edge Functions** - Serverless functions

### Deployment & CI/CD
- **GitHub Pages** - Static website hosting
- **GitHub Actions** - Automated deployment
- **Vercel/Netlify** - Alternative deployment platforms

## 🎨 Industry Coverage

The project supports data collection across 31 major industries:

| Industry Category | Coverage Areas |
|------------------|----------------|
| 💻 SaaS & Cloud Services | Enterprise software, cloud platforms, subscription services |
| 🔧 Developer Tools | Programming tools, development platforms, open source projects |
| 🤖 AI & Machine Learning | Artificial intelligence, data science, deep learning |
| 💰 FinTech | Payments, cryptocurrency, blockchain |
| 🛒 E-commerce & Retail | Online stores, marketplace platforms, retail technology |
| 🏥 Health & MedTech | Digital health, medical devices, fitness applications |
| 📚 EdTech | Online learning, educational platforms, skill training |
| 🔒 Cybersecurity | Data protection, privacy tools, security services |
| 🎮 Gaming & Entertainment | Game development, VR/AR, streaming |
| 🌱 GreenTech | Sustainability, clean energy, environmental technology |
| ... | *31 industry categories in total* |

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/happynocode/reddit-idea-scraper.git
cd reddit-idea-scraper
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
Copy and configure environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Reddit API Configuration
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=your_app_name/1.0

# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. **Database initialization**
```bash
npm run db:push
```

5. **Start development servers**
```bash
# Start frontend development server
npm run dev

# Start backend API server
npm run dev:server
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📖 User Guide

### Dashboard Features

1. **Data Browsing**
   - Filter startup ideas by industry
   - Keyword search
   - Sort by popularity/comment count
   - Time range filtering

2. **Detailed Analysis**
   - Click any idea to view detailed information
   - AI-analyzed market opportunities
   - Competitor analysis
   - Innovation scoring

3. **Data Export**
   - Export CSV format data
   - Export JSON format data
   - Custom filter condition exports

### Admin Panel (Requires Admin Privileges)

1. **Scraper Control**
   - Start/stop scraper tasks
   - Monitor scraper status
   - View task logs

2. **Data Management**
   - View data statistics
   - Manage industry categories
   - Clean historical data

## 🔧 Deployment Guide

### GitHub Pages Deployment

The project is configured for automatic deployment to GitHub Pages:

1. **Setup GitHub Secrets**
Add the following secrets in your GitHub repository settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Enable GitHub Pages**
   - Go to repository settings
   - Enable GitHub Pages
   - Select "GitHub Actions" as deployment source

3. **Automatic Deployment**
   - Push code to main branch
   - GitHub Actions automatically builds and deploys
   - Access at `https://happynocode.github.io/reddit-idea-scraper`

### Manual Build

```bash
# Build frontend
npm run build

# Build backend
npm run build:full

# Local preview
npm run preview
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for development
- Follow ESLint rules
- Write unit tests
- Update relevant documentation

## 📊 Project Status

- ✅ Core scraping functionality
- ✅ AI analysis integration
- ✅ Modern frontend interface
- ✅ User authentication system
- ✅ Data export functionality
- ✅ GitHub Pages deployment
- 🔄 Performance optimization in progress
- 🔄 Mobile adaptation in progress

## 📞 Contact

- Project Homepage: [GitHub Repository](https://github.com/happynocode/reddit-idea-scraper)
- Issue Feedback: [Issues](https://github.com/happynocode/reddit-idea-scraper/issues)
- Live Demo: [Demo](https://happynocode.github.io/reddit-idea-scraper)

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

- [Reddit API](https://www.reddit.com/dev/api/) - Data source
- [Supabase](https://supabase.io/) - Backend service
- [DeepSeek AI](https://www.deepseek.com/) - AI analysis
- [React](https://reactjs.org/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

⭐ If this project helps you, please give it a star! 
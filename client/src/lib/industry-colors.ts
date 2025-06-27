// 行业颜色映射 - 确保所有组件使用相同的颜色
export const getIndustryColor = (industryName: string): string => {
  switch (industryName) {
    // 数据库中实际的38个行业名称
    case 'SaaS & Cloud Services':
      return '#3b82f6'; // blue-500
    case 'Developer Tools & Platforms':
      return '#6b7280'; // gray-500
    case 'API & Backend Services':
      return '#7c3aed'; // violet-600
    case 'Mobile App Development':
      return '#059669'; // emerald-600
    case 'Web & Frontend Development':
      return '#0ea5e9'; // sky-500
    case 'No-Code/Low-Code Platforms':
      return '#84cc16'; // lime-500
    case 'Cybersecurity & Privacy':
      return '#dc2626'; // red-600
    case 'AI & Machine Learning':
      return '#8b5cf6'; // violet-500
    case 'E-commerce & Retail':
      return '#f59e0b'; // amber-500
    case 'Health & Fitness Tech':
      return '#ef4444'; // red-500
    case 'EdTech':
      return '#06b6d4'; // cyan-500
    case 'FinTech':
      return '#10b981'; // emerald-500
    case 'Startup & Business':
      return '#f97316'; // orange-500
    case 'Consumer Services & Freelance':
      return '#f472b6'; // pink-400
    case 'Enterprise & B2B Services':
      return '#6366f1'; // indigo-500
    case 'Digital Marketing & SEO':
      return '#16a34a'; // green-600
    case 'Social Media Marketing & Influencers':
      return '#ec4899'; // pink-500
    case 'Media & Content Creation':
      return '#a855f7'; // purple-500
    case 'Photography & Visual Arts':
      return '#0891b2'; // cyan-600
    case 'Design & Creative Tools':
      return '#9333ea'; // purple-600
    case 'Travel & Transportation':
      return '#16a34a'; // green-600
    case 'GreenTech & Sustainability':
      return '#22c55e'; // green-500
    case 'Logistics & Supply Chain':
      return '#64748b'; // slate-500
    case 'Gaming & Entertainment':
      return '#f97316'; // orange-500
    case 'Hardware & IoT':
      return '#1d4ed8'; // blue-700
    case 'AR/VR & Metaverse':
      return '#c026d3'; // fuchsia-600
    case 'BioTech & MedTech':
      return '#0891b2'; // cyan-600
    case 'LegalTech':
      return '#7c3aed'; // violet-500
    case 'PropTech':
      return '#059669'; // emerald-600
    case 'Data Science & Analytics':
      return '#14b8a6'; // teal-500
    case 'Blockchain & Cryptocurrency':
      return '#eab308'; // yellow-500
    case 'Stock Investment & Trading':
      return '#dc2626'; // red-600
    case 'Financial Independence & Personal Finance':
      return '#10b981'; // emerald-500
    case 'Audio & Podcast':
      return '#be185d'; // pink-700
    case 'AgTech':
      return '#65a30d'; // lime-600
    case 'Pet Care & Community':
      return '#f59e0b'; // amber-500
    case 'Family & Parenting':
      return '#ec4899'; // pink-500
    case 'General/Trending Topics':
      return '#f59e0b'; // amber-500
    default:
      return '#6b7280'; // gray-500
  }
};

export const getIndustryTextColor = (industryName: string): string => {
  switch (industryName) {
    // 数据库中实际的38个行业名称
    case 'SaaS & Cloud Services':
      return 'text-blue-500';
    case 'Developer Tools & Platforms':
      return 'text-gray-500';
    case 'API & Backend Services':
      return 'text-violet-600';
    case 'Mobile App Development':
      return 'text-emerald-600';
    case 'Web & Frontend Development':
      return 'text-sky-500';
    case 'No-Code/Low-Code Platforms':
      return 'text-lime-500';
    case 'Cybersecurity & Privacy':
      return 'text-red-600';
    case 'AI & Machine Learning':
      return 'text-violet-500';
    case 'E-commerce & Retail':
      return 'text-amber-500';
    case 'Health & Fitness Tech':
      return 'text-red-500';
    case 'EdTech':
      return 'text-cyan-500';
    case 'FinTech':
      return 'text-emerald-500';
    case 'Startup & Business':
      return 'text-orange-500';
    case 'Consumer Services & Freelance':
      return 'text-pink-400';
    case 'Enterprise & B2B Services':
      return 'text-indigo-500';
    case 'Digital Marketing & SEO':
      return 'text-green-600';
    case 'Social Media Marketing & Influencers':
      return 'text-pink-500';
    case 'Media & Content Creation':
      return 'text-purple-500';
    case 'Photography & Visual Arts':
      return 'text-cyan-600';
    case 'Design & Creative Tools':
      return 'text-purple-600';
    case 'Travel & Transportation':
      return 'text-green-600';
    case 'GreenTech & Sustainability':
      return 'text-green-500';
    case 'Logistics & Supply Chain':
      return 'text-slate-500';
    case 'Gaming & Entertainment':
      return 'text-orange-500';
    case 'Hardware & IoT':
      return 'text-blue-700';
    case 'AR/VR & Metaverse':
      return 'text-fuchsia-600';
    case 'BioTech & MedTech':
      return 'text-cyan-600';
    case 'LegalTech':
      return 'text-violet-500';
    case 'PropTech':
      return 'text-emerald-600';
    case 'Data Science & Analytics':
      return 'text-teal-500';
    case 'Blockchain & Cryptocurrency':
      return 'text-yellow-500';
    case 'Stock Investment & Trading':
      return 'text-red-600';
    case 'Financial Independence & Personal Finance':
      return 'text-emerald-500';
    case 'Audio & Podcast':
      return 'text-pink-700';
    case 'AgTech':
      return 'text-lime-600';
    case 'Pet Care & Community':
      return 'text-amber-500';
    case 'Family & Parenting':
      return 'text-pink-500';
    case 'General/Trending Topics':
      return 'text-amber-500';
    default:
      return 'text-gray-400';
  }
}; 
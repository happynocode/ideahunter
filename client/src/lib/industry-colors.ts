// 行业颜色映射 - 确保所有组件使用相同的颜色
export const getIndustryColor = (industryName: string): string => {
  switch (industryName) {
    case 'FinTech':
      return '#facc15'; // yellow-400
    case 'SaaS & Cloud Services':
      return '#22d3ee'; // cyan-400
    case 'AI & Machine Learning':
      return '#c084fc'; // purple-400
    case 'Health & Fitness Tech':
      return '#4ade80'; // green-400
    case 'E-commerce & Retail':
      return '#fb923c'; // orange-400
    case 'EdTech':
      return '#60a5fa'; // blue-400
    case 'Gaming & Entertainment':
      return '#f472b6'; // pink-400
    case 'Travel & Hospitality':
      return '#818cf8'; // indigo-400
    case 'Sports & Recreation':
      return '#f87171'; // red-400
    case 'Social Media & Communication':
      return '#06b6d4'; // cyan-500
    case 'Productivity & Tools':
      return '#8b5cf6'; // violet-400
    case 'Food & Beverage':
      return '#34d399'; // emerald-400
    case 'Developer Tools & Platforms':
      return '#94a3b8'; // slate-400
    case 'No-Code/Low-Code Platforms':
      return '#14b8a6'; // teal-400
    case 'Social & Community':
      return '#fb7185'; // rose-400
    // 新增行业
    case 'Healthcare':
      return '#10b981'; // emerald-500
    case 'Automotive':
      return '#ef4444'; // red-500
    case 'Real Estate':
      return '#f59e0b'; // amber-500
    case 'Fashion & Beauty':
      return '#ec4899'; // pink-500
    case 'Agriculture':
      return '#65a30d'; // lime-600
    case 'Energy & Utilities':
      return '#f97316'; // orange-500
    case 'Manufacturing':
      return '#64748b'; // slate-500
    case 'Legal & Compliance':
      return '#3b82f6'; // blue-500
    case 'Insurance':
      return '#7c3aed'; // violet-500
    case 'Logistics & Supply Chain':
      return '#059669'; // emerald-600
    case 'Media & Publishing':
      return '#dc2626'; // red-600
    case 'Cryptocurrency & Blockchain':
      return '#f59e0b'; // amber-500
    case 'Space & Aerospace':
      return '#1e40af'; // blue-700
    case 'Environmental & Sustainability':
      return '#16a34a'; // green-600
    case 'Mental Health':
      return '#8b5cf6'; // violet-400
    case 'Pet Care':
      return '#f472b6'; // pink-400
    case 'Home & Garden':
      return '#84cc16'; // lime-400
    case 'Dating & Relationships':
      return '#f43f5e'; // rose-500
    case 'Music & Audio':
      return '#a855f7'; // purple-500
    case 'Photography & Video':
      return '#06b6d4'; // cyan-500
    case 'Fitness & Wellness':
      return '#22c55e'; // green-500
    case 'Language Learning':
      return '#3b82f6'; // blue-500
    case 'Art & Design':
      return '#ec4899'; // pink-500
    case 'Science & Research':
      return '#0ea5e9'; // sky-500
    case 'Government & Public Sector':
      return '#6366f1'; // indigo-500
    case 'Non-profit & NGO':
      return '#16a34a'; // green-600
    case 'Religion & Spirituality':
      return '#a855f7'; // purple-500
    case 'Entertainment & Events':
      return '#f59e0b'; // amber-500
    case 'Security & Privacy':
      return '#dc2626'; // red-600
    case 'Remote Work & Collaboration':
      return '#06b6d4'; // cyan-500
    case 'Marketplace & Platform':
      return '#8b5cf6'; // violet-400
    case 'Content Creation':
      return '#f472b6'; // pink-400
    case 'Analytics & Data':
      return '#3b82f6'; // blue-500
    case 'Communication & Messaging':
      return '#10b981'; // emerald-500
    case 'Mobile Apps':
      return '#f59e0b'; // amber-500
    case 'Web Development':
      return '#6366f1'; // indigo-500
    case 'AR/VR':
      return '#8b5cf6'; // violet-400
    case 'IoT':
      return '#059669'; // emerald-600
    case 'Robotics':
      return '#64748b'; // slate-500
    case 'Biotech':
      return '#16a34a'; // green-600
    case 'Nanotechnology':
      return '#7c3aed'; // violet-500
    case 'Construction':
      return '#f97316'; // orange-500
    case 'Retail Tech':
      return '#ec4899'; // pink-500
    case 'Customer Service':
      return '#22c55e'; // green-500
    case 'Human Resources':
      return '#3b82f6'; // blue-500
    case 'Marketing & Advertising':
      return '#f59e0b'; // amber-500
    case 'Sales & CRM':
      return '#dc2626'; // red-600
    case 'Project Management':
      return '#06b6d4'; // cyan-500
    case 'Time Management':
      return '#8b5cf6'; // violet-400
    case 'Note Taking':
      return '#f472b6'; // pink-400
    case 'File Management':
      return '#10b981'; // emerald-500
    case 'Email & Communication':
      return '#6366f1'; // indigo-500
    case 'Calendar & Scheduling':
      return '#f59e0b'; // amber-500
    case 'Budget & Finance':
      return '#16a34a'; // green-600
    case 'Investment & Trading':
      return '#dc2626'; // red-600
    case 'Accounting':
      return '#3b82f6'; // blue-500
    case 'Payment Processing':
      return '#f97316'; // orange-500
    case 'B2B Services':
      return '#64748b'; // slate-500
    case 'B2C Services':
      return '#22c55e'; // green-500
    case 'Subscription Services':
      return '#8b5cf6'; // violet-400
    case 'Freelancing & Gig Economy':
      return '#f472b6'; // pink-400
    case 'Marketplace':
      return '#10b981'; // emerald-500
    default:
      return '#6b7280'; // gray-500
  }
};

export const getIndustryTextColor = (industryName: string): string => {
  switch (industryName) {
    case 'FinTech':
      return 'text-yellow-400';
    case 'SaaS & Cloud Services':
      return 'text-cyan-400';
    case 'AI & Machine Learning':
      return 'text-purple-400';
    case 'Health & Fitness Tech':
      return 'text-green-400';
    case 'E-commerce & Retail':
      return 'text-orange-400';
    case 'EdTech':
      return 'text-blue-400';
    case 'Gaming & Entertainment':
      return 'text-pink-400';
    case 'Travel & Hospitality':
      return 'text-indigo-400';
    case 'Sports & Recreation':
      return 'text-red-400';
    case 'Social Media & Communication':
      return 'text-cyan-500';
    case 'Productivity & Tools':
      return 'text-violet-400';
    case 'Food & Beverage':
      return 'text-emerald-400';
    case 'Developer Tools & Platforms':
      return 'text-slate-400';
    case 'No-Code/Low-Code Platforms':
      return 'text-teal-400';
    case 'Social & Community':
      return 'text-rose-400';
    // 新增行业
    case 'Healthcare':
      return 'text-emerald-500';
    case 'Automotive':
      return 'text-red-500';
    case 'Real Estate':
      return 'text-amber-500';
    case 'Fashion & Beauty':
      return 'text-pink-500';
    case 'Agriculture':
      return 'text-lime-600';
    case 'Energy & Utilities':
      return 'text-orange-500';
    case 'Manufacturing':
      return 'text-slate-500';
    case 'Legal & Compliance':
      return 'text-blue-500';
    case 'Insurance':
      return 'text-violet-500';
    case 'Logistics & Supply Chain':
      return 'text-emerald-600';
    case 'Media & Publishing':
      return 'text-red-600';
    case 'Cryptocurrency & Blockchain':
      return 'text-amber-500';
    case 'Space & Aerospace':
      return 'text-blue-700';
    case 'Environmental & Sustainability':
      return 'text-green-600';
    case 'Mental Health':
      return 'text-violet-400';
    case 'Pet Care':
      return 'text-pink-400';
    case 'Home & Garden':
      return 'text-lime-400';
    case 'Dating & Relationships':
      return 'text-rose-500';
    case 'Music & Audio':
      return 'text-purple-500';
    case 'Photography & Video':
      return 'text-cyan-500';
    case 'Fitness & Wellness':
      return 'text-green-500';
    case 'Language Learning':
      return 'text-blue-500';
    case 'Art & Design':
      return 'text-pink-500';
    case 'Science & Research':
      return 'text-sky-500';
    case 'Government & Public Sector':
      return 'text-indigo-500';
    case 'Non-profit & NGO':
      return 'text-green-600';
    case 'Religion & Spirituality':
      return 'text-purple-500';
    case 'Entertainment & Events':
      return 'text-amber-500';
    case 'Security & Privacy':
      return 'text-red-600';
    case 'Remote Work & Collaboration':
      return 'text-cyan-500';
    case 'Marketplace & Platform':
      return 'text-violet-400';
    case 'Content Creation':
      return 'text-pink-400';
    case 'Analytics & Data':
      return 'text-blue-500';
    case 'Communication & Messaging':
      return 'text-emerald-500';
    case 'Mobile Apps':
      return 'text-amber-500';
    case 'Web Development':
      return 'text-indigo-500';
    case 'AR/VR':
      return 'text-violet-400';
    case 'IoT':
      return 'text-emerald-600';
    case 'Robotics':
      return 'text-slate-500';
    case 'Biotech':
      return 'text-green-600';
    case 'Nanotechnology':
      return 'text-violet-500';
    case 'Construction':
      return 'text-orange-500';
    case 'Retail Tech':
      return 'text-pink-500';
    case 'Customer Service':
      return 'text-green-500';
    case 'Human Resources':
      return 'text-blue-500';
    case 'Marketing & Advertising':
      return 'text-amber-500';
    case 'Sales & CRM':
      return 'text-red-600';
    case 'Project Management':
      return 'text-cyan-500';
    case 'Time Management':
      return 'text-violet-400';
    case 'Note Taking':
      return 'text-pink-400';
    case 'File Management':
      return 'text-emerald-500';
    case 'Email & Communication':
      return 'text-indigo-500';
    case 'Calendar & Scheduling':
      return 'text-amber-500';
    case 'Budget & Finance':
      return 'text-green-600';
    case 'Investment & Trading':
      return 'text-red-600';
    case 'Accounting':
      return 'text-blue-500';
    case 'Payment Processing':
      return 'text-orange-500';
    case 'B2B Services':
      return 'text-slate-500';
    case 'B2C Services':
      return 'text-green-500';
    case 'Subscription Services':
      return 'text-violet-400';
    case 'Freelancing & Gig Economy':
      return 'text-pink-400';
    case 'Marketplace':
      return 'text-emerald-500';
    default:
      return 'text-gray-400';
  }
}; 
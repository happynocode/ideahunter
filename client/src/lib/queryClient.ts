import { QueryClient } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 1000, // 减少到15秒，确保行业切换等操作时能更快获取新数据
      gcTime: 5 * 60 * 1000, // 5分钟垃圾回收时间，保持缓存更长时间
      retry: (failureCount, error) => {
        // 网络错误或超时时重试，其他错误不重试
        if (failureCount < 2 && (
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('fetch')
        )) {
          return true;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避重试
      refetchOnWindowFocus: false, // 禁用窗口聚焦时自动重新获取
      refetchOnMount: 'always', // 挂载时总是重新获取最新数据
      // 网络重连时重新获取数据
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

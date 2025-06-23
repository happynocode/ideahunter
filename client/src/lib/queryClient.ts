import { QueryClient } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';

// Debug environment variables
console.log('=== Environment Variables Debug ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('VITE_SUPABASE_URL type:', typeof import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY type:', typeof import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('VITE_SUPABASE_URL length:', import.meta.env.VITE_SUPABASE_URL?.length);
console.log('VITE_SUPABASE_ANON_KEY length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
console.log('All import.meta.env:', import.meta.env);
console.log('=== End Debug ===');

// Initialize Supabase client with proper auth configuration
const supabaseUrl = 'https://niviihlfsqocuboafudh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdmlpaGxmc3FvY3Vib2FmdWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDA0MDcsImV4cCI6MjA2NjExNjQwN30.p1kZQezwzr_7ZHs5Nd8sHZouoY76MmfnHSedeRi7gSc';

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

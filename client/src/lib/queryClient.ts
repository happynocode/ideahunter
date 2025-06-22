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

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
// For local development, use Service Role Key to access database directly
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('Missing Supabase URL, using demo values');
}

if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Using Service Role Key for local development');
} else if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.log('Using Anonymous Key');
} else {
  console.warn('No Supabase keys found, using demo values');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

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
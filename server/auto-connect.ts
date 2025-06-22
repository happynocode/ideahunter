import { SupabaseStorage } from './supabase-storage.js';

export async function autoConnectSupabase(): Promise<void> {
  try {
    // Try Supabase URL + Key first
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      console.log('Testing Supabase connection with URL and key...');
      const storage = new SupabaseStorage(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      
      // Test connection by fetching industries
      await storage.getIndustries();
      await storage.initializeIndustries();
      
      // Update storage export dynamically
      const storageModule = await import('./storage.js');
      (storageModule as any).storage = storage;
      console.log('Successfully connected to Supabase and switched storage');
      return;
    }

    console.log('Supabase URL/Key not found, staying with memory storage');
  } catch (error) {
    console.error('Supabase connection failed:', error.message);
    console.log('Continuing with memory storage');
  }
}

// Auto-connect when module is imported
autoConnectSupabase();
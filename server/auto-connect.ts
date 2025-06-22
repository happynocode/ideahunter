import { switchToSupabase } from './switch-storage.js';

export async function autoConnectSupabase(): Promise<void> {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      console.log('Testing Supabase connection with URL and key...');
      const success = await switchToSupabase();
      if (success) {
        console.log('Successfully connected to Supabase and switched storage');
        return;
      }
    }

    console.log('Supabase URL/Key not found, staying with memory storage');
  } catch (error) {
    console.error('Supabase connection failed:', error.message);
    console.log('Continuing with memory storage');
  }
}

// Auto-connect when module is imported
autoConnectSupabase();
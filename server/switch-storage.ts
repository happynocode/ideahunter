import { SupabaseStorage } from './supabase-storage.js';

let currentStorage: any = null;

export async function switchToSupabase(): Promise<boolean> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return false;
    }

    console.log('Switching to Supabase storage...');
    const storage = new SupabaseStorage(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Test connection
    await storage.getIndustries();
    await storage.initializeIndustries();
    
    currentStorage = storage;
    console.log('Successfully switched to Supabase storage');
    return true;
  } catch (error) {
    console.error('Failed to switch to Supabase:', error.message);
    return false;
  }
}

export function getCurrentStorage() {
  return currentStorage;
}
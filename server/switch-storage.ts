import { neon } from '@neondatabase/serverless';
import { DatabaseStorage } from './storage.js';

export async function switchToSupabase(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('No DATABASE_URL found');
      return false;
    }

    console.log('Testing Supabase connection...');
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;
    
    console.log('Connection successful, initializing database...');
    const dbStorage = new DatabaseStorage();
    await dbStorage.initializeIndustries();
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error.message);
    return false;
  }
}
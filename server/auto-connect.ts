import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DatabaseStorage } from './storage.js';

export async function autoConnectSupabase(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('postgresql://postgres.')) {
      console.log('Valid DATABASE_URL not found, staying with memory storage');
      return;
    }

    console.log('Testing new DATABASE_URL...');
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT version()`;
    console.log('Connection successful:', result[0].version.substring(0, 50) + '...');

    // Initialize database
    const storage = new DatabaseStorage();
    await storage.initializeIndustries();
    console.log('Database initialized with industries');

    // Update storage export dynamically
    const storageModule = await import('./storage.js');
    (storageModule as any).storage = new DatabaseStorage();
    console.log('Switched to database storage');

  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Continuing with memory storage');
  }
}

// Auto-connect when module is imported
autoConnectSupabase();
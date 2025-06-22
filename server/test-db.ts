import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DatabaseStorage } from './storage.js';

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found');
      return false;
    }

    console.log('🔄 Testing database connection...');
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Test basic connection
    const result = await sql`SELECT version()`;
    console.log('✅ Database connection successful!');
    console.log('📊 PostgreSQL version:', result[0].version);
    
    // Test storage initialization
    const storage = new DatabaseStorage();
    await storage.initializeIndustries();
    console.log('✅ Database initialized with industries');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

export async function switchToDatabase(): Promise<void> {
  const isConnected = await testDatabaseConnection();
  if (isConnected) {
    console.log('🔄 Switching to database storage...');
    // We'll update the storage export dynamically
  } else {
    console.log('⚠️  Staying with memory storage');
  }
}
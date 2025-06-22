// Simple database initialization script
import { storage } from "./storage";

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Initialize industries if using DatabaseStorage
    if (storage && typeof (storage as any).initializeIndustries === 'function') {
      await (storage as any).initializeIndustries();
      console.log('Industries initialized successfully');
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
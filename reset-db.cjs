/**
 * Script to reset database
 * This will delete the existing database file
 * The Electron app will recreate it with all migrations and mock data on next startup
 * 
 * Usage: node reset-db.cjs
 * 
 * IMPORTANT: Close the Electron app before running this script!
 */

const path = require('path');
const fs = require('fs');

// Get database path (same logic as database.cjs)
// In development, database is at ./data/cleanflow.db
const dbPath = path.join(__dirname, 'data', 'cleanflow.db');

console.log('🔄 Database Reset Script');
console.log('=======================\n');
console.log('Database path:', dbPath);
console.log('');

// Delete existing database if it exists
if (fs.existsSync(dbPath)) {
  console.log('🗑️  Deleting existing database...');
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ Database deleted successfully!\n');
  } catch (error) {
    console.error('❌ Error deleting database:', error.message);
    console.log('\n⚠️  Make sure the Electron app is CLOSED before running this script.');
    console.log('   The database file might be locked by the running app.');
    process.exit(1);
  }
} else {
  console.log('ℹ️  No existing database found (this is fine)\n');
}

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created data directory:', dbDir);
}

console.log('\n✅ Database reset complete!');
console.log('\n📝 Next steps:');
console.log('   1. Start/Restart the Electron app');
console.log('   2. The app will automatically run all migrations and seed mock data');
console.log('   3. Check the Items page for inventory items');
console.log('   4. Check Dashboard for low stock alerts');
console.log('   5. Check Reorder Management page');
console.log('   6. Check Inventory Valuation page');
console.log('\n🎉 Ready to test!');


/**
 * Manual script to run the invoice data seed migration
 * Run this from Electron's main process context
 */

const { app } = require('electron');
const path = require('path');

// Set up app context
if (!app) {
  console.error('This script must be run from Electron context');
  process.exit(1);
}

const { getDatabase } = require('../electron/db/database.cjs');
const { seedInvoiceData } = require('../electron/db/migrations.cjs');

async function runSeed() {
  try {
    console.log('Running invoice data seed...');
    const db = getDatabase();
    
    // Check if migration already ran
    const checkMigration = db.prepare("SELECT id FROM migrations WHERE name = ?");
    const existing = checkMigration.get('028_seed_invoice_data');
    
    if (existing) {
      console.log('Migration 028_seed_invoice_data already executed');
      return;
    }
    
    // Run the seed function
    seedInvoiceData(db);
    
    // Mark as executed
    const insertMigration = db.prepare("INSERT INTO migrations (name, executed_at) VALUES (?, datetime('now'))");
    insertMigration.run('028_seed_invoice_data');
    
    console.log('Invoice data seed completed successfully!');
  } catch (error) {
    console.error('Error running seed:', error);
    throw error;
  }
}

// Export for use in main process
module.exports = { runSeed };


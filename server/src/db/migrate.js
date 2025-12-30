/**
 * Database Migration Script
 *
 * Runs the schema.sql file to set up the database.
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { Pool } = require("pg");

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "cleanflow_pos",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  console.log("🔄 Running database migrations...");
  console.log(`📊 Database: ${process.env.DB_NAME || "cleanflow_pos"}`);
  console.log(
    `🏠 Host: ${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || 5432
    }`
  );

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, "..", "..", "schema.sql");
    console.log(`📄 Reading schema from: ${schemaPath}`);

    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Execute schema
    console.log("⚡ Executing schema...");
    await pool.query(schema);

    console.log("✅ Database migration completed successfully!");

    // Show table counts
    const tables = [
      "users",
      "customers",
      "service_types",
      "jobs",
      "payments",
      "expenses",
      "ledger_entries",
      "audit_logs",
      "devices",
      "sync_operations",
      "sync_queue",
      "sync_conflicts",
    ];

    console.log("\n📊 Table status:");
    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        console.log(`   ${table}: ${result.rows[0].count} rows`);
      } catch (e) {
        console.log(`   ${table}: created (0 rows)`);
      }
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

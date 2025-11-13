// setup-tables.js
import pg from "pg";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function setupTables() {
  console.log("🚀 Creating tables from schema.sql...\n");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Connect to database
    await client.connect();
    console.log("✅ Connected to Supabase database");

    // Read schema file
    const sql = readFileSync("./schema.sql", "utf-8");
    console.log("📋 Read schema.sql");

    // Execute SQL
    await client.query(sql);
    console.log("✅ Tables created successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

setupTables();

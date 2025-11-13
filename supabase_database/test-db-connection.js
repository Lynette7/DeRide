import pg from "pg";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

async function testConnection() {
  console.log("🧪 Testing database connection...\n");
  
  // Show what DATABASE_URL contains (masked for security)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in .env file!");
    return;
  }
  
  const hostname = dbUrl.match(/@([^:]+)/)?.[1];
  console.log("Hostname:", hostname);
  console.log("Using pooling URL:", hostname?.includes('pooler.supabase.com') ? "✅ Yes" : "❌ No");
  console.log("DATABASE_URL length:", dbUrl.length, "characters");
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Connection successful!");
    
    const result = await client.query("SELECT version()");
    console.log("✅ Database version:", result.rows[0].version);
    
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    if (error.code === 'ENOTFOUND') {
      console.error("\n💡 Tip: Make sure DATABASE_URL in .env uses the pooling URL:");
      console.error("   postgresql://postgres.PROJECT_REF:PASSWORD@aws-X-REGION.pooler.supabase.com:6543/postgres");
    }
  } finally {
    await client.end();
  }
}

testConnection();
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌ TURSO_DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
  console.log("🚀 Running database migrations...");

  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS admins      (id TEXT PRIMARY KEY, data TEXT)`);
    console.log("✅ Table 'admins' ready.");

    await client.execute(`CREATE TABLE IF NOT EXISTS users       (id TEXT PRIMARY KEY, data TEXT)`);
    console.log("✅ Table 'users' ready.");

    await client.execute(`CREATE TABLE IF NOT EXISTS restaurants (id TEXT PRIMARY KEY, data TEXT)`);
    console.log("✅ Table 'restaurants' ready.");

    await client.execute(`CREATE TABLE IF NOT EXISTS orders      (id TEXT PRIMARY KEY, data TEXT)`);
    console.log("✅ Table 'orders' ready.");

    await client.execute(`CREATE TABLE IF NOT EXISTS reviews     (id TEXT PRIMARY KEY, data TEXT)`);
    console.log("✅ Table 'reviews' ready.");

    await client.execute(`CREATE TABLE IF NOT EXISTS settings    (key TEXT PRIMARY KEY, value TEXT)`);
    console.log("✅ Table 'settings' ready.");

    console.log("✅ All migrations completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();

import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

// ✅ لو في TURSO_URL → اتصل بـ Turso cloud
// ✅ لو مفيش (local dev) → استخدم SQLite عادي
const client = createClient(
  process.env.TURSO_URL
    ? {
        url:       process.env.TURSO_URL,
        authToken: process.env.TURSO_TOKEN,
      }
    : {
        url: "file:./mutafer.db", // local development
      }
);

async function initTables() { 
  await client.execute(` 
    CREATE TABLE IF NOT EXISTS admins      (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS users       (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS restaurants (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS orders      (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS reviews     (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS settings    (key TEXT PRIMARY KEY, value TEXT);
  `);

  console.log("✅ Tables ready");
}

await initTables();

// ── الـ API نفسه زي الأول ────────────────────────────────
const ALLOWED_TABLES = ["admins","users","restaurants","orders","reviews"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

function assertAllowedTable(table: string): asserts table is AllowedTable {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table))
    throw new Error(`[DB] Unauthorized table: "${table}"`);
}

export function getCollection<T = any>(table: string) {
  assertAllowedTable(table);

  return {
    async all(): Promise<T[]> {
      const res = await client.execute(`SELECT data FROM ${table}`);
      return res.rows.map((r: any) => JSON.parse(r.data));
    },

    async get(id: string): Promise<T | null> {
      const res = await client.execute({
        sql: `SELECT data FROM ${table} WHERE id = ?`,
        args: [id],
      });
      return res.rows[0] ? JSON.parse(res.rows[0].data as string) : null;
    },

    async set(id: string, data: T): Promise<void> {
      await client.execute({
        sql: `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`,
        args: [id, JSON.stringify(data)],
      });
    },

    async delete(id: string): Promise<void> {
      await client.execute({
        sql: `DELETE FROM ${table} WHERE id = ?`,
        args: [id],
      });
    },
  };
}

export const admins      = getCollection("admins");
export const users       = getCollection("users");
export const restaurants = getCollection("restaurants");
export const orders      = getCollection("orders");
export const reviews     = getCollection("reviews");
export const settings = {
  async all() {
    const res = await client.execute(`SELECT value FROM settings`);
    return res.rows.map((r: any) => JSON.parse(r.value));
  },
  async get(key: string) {
    return await getSetting(key, null);
  },
  async set(key: string, value: any) {
    await setSetting(key, value);
  },
};

// settings
export async function getSetting(key: string, defaultValue: any) {
  const res = await client.execute({
    sql: `SELECT value FROM settings WHERE key = ?`,
    args: [key],
  });
  return res.rows[0] ? JSON.parse(res.rows[0].value as string) : defaultValue;
}

export async function setSetting(key: string, value: any) {
  await client.execute({
    sql: `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    args: [key, JSON.stringify(value)],
  });
}

export default client;
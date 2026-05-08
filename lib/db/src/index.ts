import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Tambahkan database connection string di Replit Secrets.",
  );
}

// Enable SSL for Supabase URLs or when sslmode=require is specified
const useSsl =
  /sslmode=require/i.test(connectionString) ||
  /\.supabase\.co/i.test(connectionString) ||
  /\.supabase\.com/i.test(connectionString) ||
  /pooler\.supabase/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 0,
  keepAlive: true,
});

pool
  .connect()
  .then((client) => client.release())
  .catch(() => {});

export const db = drizzle(pool, { schema });

export * from "./schema";

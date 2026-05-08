import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL harus diisi. Pastikan database PostgreSQL Replit sudah terhubung.",
  );
}

const useSsl =
  /sslmode=require/i.test(connectionString) ||
  /\.supabase\.co/i.test(connectionString) ||
  /\.supabase\.com/i.test(connectionString) ||
  /pooler\.supabase/i.test(connectionString) ||
  /neon\.tech/i.test(connectionString);

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

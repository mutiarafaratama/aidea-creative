import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL harus diisi. Tambahkan connection string Supabase di Replit Secrets.",
  );
}

// Supabase selalu butuh SSL
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

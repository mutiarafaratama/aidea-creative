import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Tambahkan database connection string di Replit Secrets.",
  );
}

const useSsl = /sslmode=require/i.test(connectionString) || /supabase\.co/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  // Keep connections warm to avoid the ~1.3s TLS handshake on every cold
  // request to Supabase. Without this, idle connections close after 10s
  // and every subsequent request pays the reconnect cost.
  max: 5,
  idleTimeoutMillis: 0,
  keepAlive: true,
});

// Eagerly open one connection at boot so the very first user request is fast.
pool
  .connect()
  .then((client) => client.release())
  .catch(() => {
    // Surface errors only via subsequent queries; do not crash boot.
  });
export const db = drizzle(pool, { schema });

export * from "./schema";

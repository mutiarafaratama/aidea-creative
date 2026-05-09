import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL harus diisi. Tambahkan connection string PostgreSQL di Replit Secrets.",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: false,
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

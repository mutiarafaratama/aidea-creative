import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL harus diisi. Tambahkan di Replit Secrets.");
}

const isRemote =
  /\.supabase\.co/i.test(connectionString) ||
  /neon\.tech/i.test(connectionString) ||
  /sslmode=require/i.test(connectionString);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});

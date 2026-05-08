import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricelist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kategori TEXT NOT NULL,
        gambar_url TEXT NOT NULL,
        urutan INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    logger.info("DB migrations completed");
  } catch (err) {
    logger.error({ err }, "DB migration error — continuing startup");
  } finally {
    client.release();
  }
}

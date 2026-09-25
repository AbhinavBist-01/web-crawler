import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      title TEXT,
      status_code INTEGER,
      crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crawl_queue (
      id SERIAL PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Update existing crawl_queue table
  await pool.query(`
    ALTER TABLE crawl_queue
    ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

    ALTER TABLE crawl_queue
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

    ALTER TABLE crawl_queue
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;
  `);

  console.log("Database schema ready!");

  await pool.end();
}

createTables();

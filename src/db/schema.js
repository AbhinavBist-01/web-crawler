import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      title TEXT,
      status_code INTEGER,
      crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Tables created!");
  await pool.end();
}

createTables();

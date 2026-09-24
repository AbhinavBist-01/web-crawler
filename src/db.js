import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function savePage(url, title, status_code) {
  await pool.query(
    `
        INSERT INTO pages (url, title, status_code)
        VALUES ($1, $2, $3)
        ON CONFLICT (url) DO NOTHING
        `,
    [url, title, status_code],
  );
}

export async function addToQueue(url) {
  await pool.query(
    `
        INSERT INTO crawl_queue (url)
        VALUES ($1)
        ON CONFLICT (url) DO NOTHING
        `,
    [url],
  );
}

export async function getNextUrl() {
  const result = await pool.query(
    `
    SELECT url 
    FROM crawl_queue
    WHERE status = 'pending'
    ORDER BY id
    LIMIT 1
    `,
  );
  return result.rows[0]?.url;
}

export async function markCompleted(url) {
  await pool.query(
    `
    UPDATE crawl_queue
    SET status = 'completed'
    WHERE url = $1
    `,
    [url],
  );
}

export async function markFailed(url) {
  await pool.query(
    `
    UPDATE crawl_queue
    SET status = 'failed'
    WHERE url = $1
    `,
    [url],
  );
}

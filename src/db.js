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
  const result = await pool.query(`
    UPDATE crawl_queue
    SET 
    status = 'crawling'
    WHERE id = (
      SELECT id
      FROM crawl_queue
      WHERE status = 'pending'
        AND (
          next_retry_at IS NULL
          OR next_retry_at <= CURRENT_TIMESTAMP
        )
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING url;
  `);

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

export async function markFailed(url, statusCode) {
  await pool.query(
    `
    UPDATE crawl_queue
    SET
      attempts = attempts + 1,
      status = CASE
        WHEN $2 = 404 THEN 'failed'
        WHEN attempts + 1 >= 3 THEN 'failed'
        ELSE 'pending'
      END,
      next_retry_at = CASE
        WHEN $2 = 404 THEN NULL
        WHEN attempts + 1 >= 3 THEN NULL
        ELSE CURRENT_TIMESTAMP + INTERVAL '10 seconds'
      END
    WHERE url = $1
    `,
    [url, statusCode],
  );
}

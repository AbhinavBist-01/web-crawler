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

async function test() {
  await savePage("https://example.com", "Example Domain", 200);

  console.log("Saved!");
}

test();

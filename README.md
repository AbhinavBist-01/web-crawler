# 🕷️ Distributed & Resilient Web Crawler

A high-performance, concurrent, and polite web crawler built with **Node.js (ES Modules)** and **PostgreSQL**. Designed for robust web indexing with atomic work-queue distribution, exponential backoff retries, robots.txt compliance, URL canonicalization, and real-time crawl telemetry.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Database Schema & Data Model](#-database-schema--data-model)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [Configuration & Tuning](#-configuration--tuning)
- [Production Best Practices & Resiliency](#-production-best-practices--resiliency)
- [License](#-license)

---

## ✨ Key Features

- **⚡ Concurrent Worker Architecture**
  Multiple async workers pull jobs concurrently from PostgreSQL without race conditions or duplicate processing using `FOR UPDATE SKIP LOCKED`.

- **🛡️ Fault Tolerance & Exponential Backoff**
  Automatic transient error recovery with dynamic backoff scheduling (`5 * 2^attempts` seconds). Terminal HTTP errors (such as `404 Not Found`) are immediately classified as permanent failures without wasteful retries.

- **🤖 Polite Crawling & Robots.txt Compliance**
  Parses origin `robots.txt` files and in-memory caches disallow rules per domain to prevent crawler bans and respect site policies. Includes configurable per-worker rate delays.

- **🧹 Clean URL Normalization**
  Eliminates duplicate crawl attempts through URL canonicalization: strips tracking parameters (`utm_*`, `fbclid`, `gclid`), removes hash fragments, and normalizes trailing slashes.

- **📊 Comprehensive Telemetry & Analytics**
  Records end-of-run diagnostics into PostgreSQL (`crawl_runs`), tracking HTTP status code breakdown, average response times, total elapsed time, and page throughput.

- **⏱️ Resource Guardrails & Timeouts**
  Guards against hang-ups and memory bloat using 10-second request timeouts (`AbortController`), HTML-only content-type filtering, and strict crawl depth / max-page bounds.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Storage ["PostgreSQL Database"]
        Q[("crawl_queue\n(Pending Jobs)")]
        P[("pages\n(Extracted Data)")]
        R[("crawl_runs\n(Run Telemetry)")]
    end

    subgraph Workers ["Concurrent Workers (1..N)"]
        W1["Worker 1"]
        W2["Worker 2"]
        W3["Worker 3"]
    end

    subgraph Pipeline ["Processing Pipeline"]
        Fetch["fetcher.js\n• 10s AbortController\n• text/html verification"]
        Robots["robots.js\n• robots.txt validation\n• In-memory cache"]
        Parse["parser.js\n• cheerio DOM extraction\n• Link discovery"]
        Norm["url.js\n• Strip UTM & tracking\n• Normalize slashes"]
    end

    Q -- "SELECT ... FOR UPDATE SKIP LOCKED" --> W1 & W2 & W3
    W1 & W2 & W3 --> Robots
    Robots -- "Allowed" --> Fetch
    Fetch -- "Failure (HTTP / Timeout)" --> Q
    Fetch -- "200 OK HTML" --> Parse
    Parse --> Norm
    Parse --> P
    Norm -- "Enqueue (depth + 1)" --> Q
    W1 & W2 & W3 -- "Final Run Metrics" --> R
```

---

## 🗄️ Database Schema & Data Model

The persistence layer uses PostgreSQL to orchestrate the distributed queue and store crawled pages.

### 1. `crawl_queue`
Manages crawl state, worker synchronization, and retry schedules.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique job identifier. |
| `url` | `TEXT UNIQUE NOT NULL` | Target URL to crawl. |
| `status` | `TEXT DEFAULT 'pending'` | Current state: `'pending'`, `'crawling'`, `'completed'`, `'failed'`. |
| `depth` | `INTEGER DEFAULT 0` | Distance from the seed URL. |
| `attempts` | `INTEGER DEFAULT 0` | Number of crawl attempts made. |
| `next_retry_at` | `TIMESTAMP` | Timestamp for exponential backoff retry. |
| `created_at` | `TIMESTAMP` | Record creation timestamp. |

### 2. `pages`
Stores parsed and extracted page artifacts.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique record identifier. |
| `url` | `TEXT UNIQUE NOT NULL` | Canonical crawled URL. |
| `title` | `TEXT` | Extracted `<title>` tag. |
| `status_code` | `INTEGER` | HTTP response code (e.g., `200`). |
| `crawled_at` | `TIMESTAMP` | Timestamp when page was stored. |

### 3. `crawl_runs`
Provides run-level observability and historical benchmark metrics.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique crawl session ID. |
| `start_url` | `TEXT NOT NULL` | Starting seed URL. |
| `pages_crawled` | `INTEGER` | Number of successfully processed pages. |
| `pages_failed` | `INTEGER` | Number of permanently failed pages. |
| `total_response_time` | `INTEGER` | Cumulative response time (ms). |
| `started_at` | `TIMESTAMP` | Start timestamp. |
| `finished_at` | `TIMESTAMP` | Completion timestamp. |

---

## 📂 Project Structure

```text
web-crawler/
├── src/
│   ├── db/
│   │   └── schema.js       # Database migrations & table initialization
│   ├── crawler.js          # Core orchestrator & worker lifecycle loops
│   ├── db.js               # PostgreSQL connection pool & transactional queries
│   ├── fetcher.js          # HTTP client with timeouts, headers & error handling
│   ├── limiter.js          # Rate-limiting and sleep utilities
│   ├── parser.js           # HTML parsing with Cheerio (DOM, links, titles)
│   ├── robots.js           # Robots.txt fetcher, parser & rule evaluator
│   └── url.js              # URL sanitization, parameter stripping & normalization
├── .env.example            # Sample environment variables template
├── package.json            # Node.js project manifest & script declarations
└── README.md               # Documentation & operational guide
```

---

## 📋 Prerequisites

- **Node.js**: `v18.0.0` or higher (native `fetch` support required)
- **PostgreSQL**: `v12` or higher (supports `SKIP LOCKED`) or cloud-hosted PostgreSQL (Neon, Supabase, RDS)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/web-crawler.git
cd web-crawler
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start PostgreSQL (Optional via Docker)
If you do not have PostgreSQL installed locally or prefer Docker, spin up the containerized database:
```bash
docker compose up -d
```
This spins up PostgreSQL on port `5432` with volume persistence and health checks.

### 4. Configure Environment Variables
Copy the sample environment file and provide your database credentials:
```bash
cp .env.example .env
```
If using the Docker container above, the default connection string in `.env.example` will work out of the box:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/web_crawler?sslmode=disable"
```

### 5. Initialize Database Schema
Run the schema migration script to create the necessary tables and indexes:
```bash
npm run db:setup
```

---

## 💻 Usage

### Run the Crawler
Start the crawler process using:
```bash
npm start
```
*(Direct execution: `node src/crawler.js`)*

### Example Terminal Output
```text
Worker 1 crawling: https://books.toscrape.com/
Worker 2 crawling: https://books.toscrape.com/catalogue/category/books_1/index.html
Worker 3 crawling: https://books.toscrape.com/catalogue/category/books/travel_2/index.html
Worker 1 - Title: All products | Books to Scrape - Sandbox
Worker 2 - Title: Books | Books to Scrape - Sandbox
...

===== CRAWL STATS =====
Pages crawled: 100
Pages failed: 0
=======================

Status codes:
200 → 100

Average response time: 245.30ms
```

---

## ⚙️ Configuration & Tuning

Key crawler parameters can be tuned directly inside [`src/crawler.js`](src/crawler.js):

| Parameter | Location | Default | Description |
| :--- | :--- | :--- | :--- |
| `MAX_PAGES` | `crawl()` | `100` | Safety limit on total pages crawled per session. |
| `MAX_DEPTH` | `worker()` | `2` | Maximum link depth traversed from the seed URL. |
| `worker count` | `crawl()` | `3` | Number of concurrent workers running in parallel. |
| `delay(ms)` | `worker()` | `1000` | Politeness sleep delay before each fetch. |
| Request Timeout | `src/fetcher.js` | `10000ms` | Abort signal threshold for slow or hung responses. |
| Retry Backoff | `src/db.js` | `5 * 2^attempts` | Exponential backoff delay for retried requests. |

---

## 🛡️ Production Best Practices & Resiliency

1. **Lock Contention Free Scheduling**: Uses `FOR UPDATE SKIP LOCKED` during job dequeue, allowing horizontal scaling across multiple instances without job collisions or deadlocks.
2. **Graceful Failures**: Non-recoverable HTTP status codes (e.g., `404`) do not pollute the retry queue.
3. **MIME-Type Protection**: Non-HTML payloads (images, PDFs, binaries) are rejected early in the fetch pipeline to conserve memory and network bandwidth.
4. **Normalized Storage**: URLs are cleaned of tracking parameters (`utm_*`, `fbclid`), avoiding redundant downloads of identical pages.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

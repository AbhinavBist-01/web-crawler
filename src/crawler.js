import { fetchPage } from "./fetcher.js";
import { parsePage } from "./parser.js";
import { normalizeUrl } from "./url.js";
import { canCrawl } from "./robots.js";
import { delay } from "./limiter.js";
import {
  savePage,
  markCompleted,
  getNextUrl,
  addToQueue,
  markFailed,
} from "./db.js";

async function worker(id, startUrl, stats) {
  const MAX_PAGES = 100;
  let pagesCrawled = 0;

  function isSameDomain(url) {
    const startDomain = new URL(startUrl).hostname;
    const urlDomain = new URL(url).hostname;
    return startDomain === urlDomain;
  }

  while (true) {
    const job = await getNextUrl();
    if (!job) break;

    if (pagesCrawled >= MAX_PAGES) {
      break;
    }
    pagesCrawled++;
    const { url, depth } = job;
    console.log(`Worker ${id} crawling:${url}`);
    await delay(1000);

    try {
      const data = await fetchPage(url);

      const parsedData = parsePage(data.html, url);

      let canonicalUrl = parsedData.canonical;

      if (parsedData.canonical) {
        canonicalUrl = normalizeUrl(parsedData.canonical, url);
      }

      console.log(`Worker ${id} - Title ${parsedData.title}`);

      await savePage(url, parsedData.title, data.status_code);

      await markCompleted(url);

      stats.crawled++;

      const MAX_DEPTH = 2;

      for (const link of parsedData.links) {
        const normalizedUrl = normalizeUrl(link, url);

        if (
          depth < MAX_DEPTH &&
          isSameDomain(normalizedUrl) &&
          (await canCrawl(normalizedUrl))
        ) {
          await addToQueue(normalizedUrl, depth + 1);
        }
      }
    } catch (err) {
      console.error(`Worker ${id} failed: ${err.message}`);
      console.log("STATUS:", err.statusCode);

      await markFailed(url, err.statusCode);
      stats.failed++;
    }
  }
}
async function crawl(startUrl) {
  let stats = {
    crawled: 0,
    failed: 0,
  };
  await addToQueue(startUrl);

  await Promise.all([
    worker(1, startUrl, stats),
    worker(2, startUrl, stats),
    worker(3, startUrl, stats),
  ]);

  console.log("\n===== CRAWL STATS =====");
  console.log(`Pages crawled: ${stats.crawled}`);
  console.log(`Pages failed: ${stats.failed}`);
  console.log("=======================");
}
crawl("https://claude.com");

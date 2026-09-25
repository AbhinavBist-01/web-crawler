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
  saveCrawlRun,
} from "./db.js";

async function worker(id, startUrl, stats, MAX_PAGES) {
  const MAX_DEPTH = 2;
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
      const startTime = Date.now();
      const data = await fetchPage(url);
      const responseTime = Date.now() - startTime;
      const status = data.status_code;

      stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;
      stats.totalResponseTime += responseTime;

      const parsedData = parsePage(data.html, url);

      // let canonicalUrl = parsedData.canonical;

      // if (parsedData.canonical) {
      //   canonicalUrl = normalizeUrl(parsedData.canonical, url);
      // }

      console.log(`Worker ${id} - Title ${parsedData.title}`);

      await savePage(url, parsedData.title, data.status_code);

      await markCompleted(url);

      stats.crawled++;

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
      if (err.statusCode) {
        stats.statusCodes[err.statusCode] =
          (stats.statusCodes[err.statusCode] || 0) + 1;
      }
    }
  }
}
async function crawl(startUrl) {
  const MAX_PAGES = 100;

  let stats = {
    crawled: 0,
    failed: 0,
    statusCodes: {},
    totalResponseTime: 0,
  };
  await addToQueue(startUrl);

  await Promise.all([
    worker(1, startUrl, stats, MAX_PAGES),
    worker(2, startUrl, stats, MAX_PAGES),
    worker(3, startUrl, stats, MAX_PAGES),
  ]);

  console.log("\n===== CRAWL STATS =====");
  console.log(`Pages crawled: ${stats.crawled}`);
  console.log(`Pages failed: ${stats.failed}`);
  console.log("=======================");
  console.log("\nStatus codes:");

  for (const [status, count] of Object.entries(stats.statusCodes)) {
    console.log(`${status} → ${count}`);
  }
  const averageResponseTime =
    stats.crawled > 0 ? stats.totalResponseTime / stats.crawled : 0;

  console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);

  await saveCrawlRun(
    startUrl,
    stats.crawled,
    stats.failed,
    stats.totalResponseTime,
  );
}
crawl("https://books.toscrape.com/");

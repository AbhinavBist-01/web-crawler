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

async function worker(id, startUrl) {
  function isSameDomain(url) {
    const startDomain = new URL(startUrl).hostname;
    const urlDomain = new URL(url).hostname;
    return startDomain === urlDomain;
  }

  while (true) {
    const url = await getNextUrl();
    if (!url) break;

    console.log(`Worker ${id} crawling:${url}`);
    await delay(1000);

    try {
      const data = await fetchPage(url);
      console.log("FETCHED:", data);
      const parsedData = parsePage(data.html, url);

      console.log(`Worker ${id} - Title ${parsedData.title}`);

      await savePage(url, parsedData.title, data.status_code);
      console.log("SAVED PAGE");

      await markCompleted(url);
      console.log("MARKED COMPLETED");

      for (const link of parsedData.links) {
        const normalizedUrl = normalizeUrl(link, url);
        console.log("LINK:", normalizedUrl);

        if (isSameDomain(normalizedUrl) && (await canCrawl(normalizedUrl))) {
          await addToQueue(normalizedUrl);
          console.log("ADDED:", normalizedUrl);
        }
      }
    } catch (err) {
      console.error(`Worker ${id} failed: ${err.message}`);
      console.log("STATUS:", err.statusCode);

      await markFailed(url);
    }
  }
}
async function crawl(startUrl) {
  await addToQueue(startUrl);

  await Promise.all([
    worker(1, startUrl),
    worker(2, startUrl),
    worker(3, startUrl),
  ]);
}
crawl("https://chaicode.com");

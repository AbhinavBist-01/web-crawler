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

async function crawl(startUrl) {
  await addToQueue(startUrl);

  function isSameDomain(url) {
    const startDomain = new URL(startUrl).hostname;
    const urlDomain = new URL(url).hostname;
    return startDomain === urlDomain;
  }

  while (true) {
    const url = await getNextUrl();
    if (!url) break;

    console.log(`Crawling: ${url}`);
    await delay(1000);

    try {
      const data = await fetchPage(url);
      const parsedData = parsePage(data.html, url);

      console.log(`Title: ${parsedData.title}`);

      await savePage(url, parsedData.title, data.status_code);

      await markCompleted(url);

      for (const link of data.links) {
        const normalizedUrl = normalizeUrl(link, url);
        if (
          !visited.has(normalizedUrl) &&
          isSameDomain(normalizedUrl) &&
          (await canCrawl(normalizedUrl))
        ) {
          await addToQueue(normalizedUrl);
        }
      }
    } catch (err) {
      console.error(`Error crawling ${url}: ${err.message}`);

      await markFailed(url);
    }
  }
}
crawl("https://google.com");

import { fetchPage } from "./fetcher.js";
import { parsePage } from "./parser.js";
import { normalizeUrl } from "./url.js";
import { canCrawl } from "./robots.js";
import { delay } from "./limiter.js";
import { savePage } from "./db.js";

const queue = [];
const visited = new Set();

async function crawl(startUrl) {
  queue.push(startUrl);

  function isSameDomain(url) {
    const startDomain = new URL(startUrl).hostname;
    const urlDomain = new URL(url).hostname;
    return startDomain === urlDomain;
  }

  while (queue.length > 0) {
    const url = queue.shift();

    if (visited.has(url)) continue;

    visited.add(url);

    console.log(`Crawling: ${url}`);
    await delay(1000);

    try {
      const data = await fetchPage(url);
      const parsedData = parsePage(data.html, url);

      console.log(`Title: ${data.title}`);

      await savePage(url, data.title, data.status_code);

      for (const link of data.links) {
        const normalizedUrl = normalizeUrl(link, url);
        if (
          !visited.has(normalizedUrl) &&
          isSameDomain(normalizedUrl) &&
          (await canCrawl(normalizedUrl))
        ) {
          queue.push(normalizedUrl);
        }
      }
    } catch (err) {
      console.error(`Error crawling ${url}: ${err.message}`);
    }
  }
}
crawl("https://google.com");

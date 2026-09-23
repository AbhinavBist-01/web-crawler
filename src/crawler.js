import { fetchPage } from "./fetcher.js";
import { parsePage } from "./parser.js";

const queue = [];
const visited = new Set();

async function crawl(startUrl) {
  queue.push(startUrl);

  while (queue.length > 0) {
    const url = queue.shift();

    if (visited.has(url)) continue;

    visited.add(url);

    console.log(`Crawling: ${url}`);

    try {
      const html = await fetchPage(url);
      const data = parsePage(html, url);

      console.log(`Title: ${data.title}`);

      for (const link of data.links) {
        if (!visited.has(link)) {
          queue.push(link);
        }
      }
    } catch (err) {
      console.error(`Error crawling ${url}: ${err.message}`);
    }
  }
}
crawl("https://google.com");

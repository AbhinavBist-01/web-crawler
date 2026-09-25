import * as cheerio from "cheerio";

export function parsePage(html, baseUrl) {
  const $ = cheerio.load(html);

  const title = $("title").text().trim();
  const links = [];

  const canonical = $("link[rel='canonical']").attr("href") || null;

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    try {
      const url = new URL(href, baseUrl);

      if (url.protocol === "http:" || url.protocol === "https:") {
        links.push(url.href);
      }
    } catch {
      // Ignore invalid URLs
    }
  });
  return { title, links, canonical };
}

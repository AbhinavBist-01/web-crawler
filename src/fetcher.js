export async function fetchPage(url) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MyCrawler/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return {
      html: await response.text(),
      status_code: response.status,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

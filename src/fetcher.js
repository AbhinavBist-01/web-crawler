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
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.statusCode = response.status;
        throw error;
      }
    }
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("text/html")) {
      throw new Error(`Not an HTML page: ${contentType}`);
    }
    return {
      html: await response.text(),
      status_code: response.status,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function canCrawl(url) {
  const robotsUrl = new URL("/robots.txt", url).href;

  const response = await fetch(robotsUrl);

  if (!response.ok) {
    return true;
  }

  const robotsTxt = await response.text();

  const urlObj = new URL(url);
  const path = urlObj.pathname;

  const lines = robotsTxt.split("\n");

  let isGlobalRules = false;
  const disallowed = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("User-agent:")) {
      isGlobalRules = trimmed === "User-agent: *";
      continue;
    }

    if (isGlobalRules && trimmed.startsWith("Disallow:")) {
      const path = trimmed.replace("Disallow:", "").trim();

      if (path) {
        disallowed.push(path);
      }
    }
  }

  return !disallowed.some((rule) => path.startsWith(rule));
}

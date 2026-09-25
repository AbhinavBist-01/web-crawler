const robotsCache = new Map();

function checkRules(rules, path) {
  return !rules.some((rule) => path.startsWith(rule));
}

export async function canCrawl(url) {
  const urlObj = new URL(url);
  const origin = urlObj.origin;

  if (robotsCache.has(origin)) {
    return checkRules(robotsCache.get(origin), urlObj.pathname);
  }

  const robotsUrl = `${origin}/robots.txt`;

  const response = await fetch(robotsUrl);

  if (!response.ok) {
    robotsCache.set(origin, []);
    return true;
  }

  const robotsTxt = await response.text();

  const rules = parseRobots(robotsTxt);

  robotsCache.set(origin, rules);

  return checkRules(rules, urlObj.pathname);
}

function parseRobots(robotsTxt) {
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

  return disallowed;
}

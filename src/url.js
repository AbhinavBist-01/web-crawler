// Normalisation of the url will be done here

export function normalizeUrl(link, baseUrl) {
  const urlObj = new URL(link, baseUrl);

  urlObj.hash = "";
  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
  ];

  for (const param of trackingParams) {
    urlObj.searchParams.delete(param);
  }

  let pathName = urlObj.pathname;

  if (pathName.length > 1 && pathName.endsWith("/")) {
    pathName = pathName.slice(0, -1);
  }

  urlObj.pathname = pathName;

  return urlObj.origin + urlObj.pathname + urlObj.search;
}

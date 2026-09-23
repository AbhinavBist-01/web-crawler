// Normalisation of the url will be done here

export function normalizeUrl(link, baseUrl) {
  const urlObj = new URL(link, baseUrl);

  let pathName = urlObj.pathname;
  if (pathName.length > 1 && pathName.endsWith("/")) {
    pathName = pathName.slice(0, -1);
  }
  return "https://" + urlObj.hostname + pathName;
}

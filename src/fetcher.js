export async function fetchPage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return {
    html: await response.text(),
    status_code: response.status,
  };
}

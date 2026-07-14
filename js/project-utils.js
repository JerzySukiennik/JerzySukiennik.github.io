const PROJECT_IMAGE_ORIGIN = "https://jerzysukiennik.github.io";
const SAFE_PROJECT_IMAGE_PATH = /^\/project-images\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function safeProjectUrl(value) {
  try {
    const url = new URL(String(value));
    const safeProtocol = url.protocol === "http:" || url.protocol === "https:";
    return safeProtocol && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function safeProjectImageUrl(value) {
  try {
    const url = new URL(String(value));
    const safe = url.origin === PROJECT_IMAGE_ORIGIN
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && SAFE_PROJECT_IMAGE_PATH.test(url.pathname);
    return safe ? url.href : "";
  } catch {
    return "";
  }
}

export function toMillis(value, fallbackYear = "0") {
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value || "");
  if (Number.isFinite(parsed)) return parsed;

  const year = Number.parseInt(fallbackYear, 10);
  return Number.isInteger(year) && year >= 1000 && year <= 9999
    ? Date.UTC(year, 0, 1)
    : 0;
}

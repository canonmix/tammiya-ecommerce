// Only ever redirect back to a path on this site — "//evil.com" and absolute URLs are rejected.
export function safeNext(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

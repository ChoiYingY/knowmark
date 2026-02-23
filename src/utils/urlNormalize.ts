export function parseHttpUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    // hostname check is mostly redundant, but harmless
    if (!parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isValidUrl(input: string): boolean {
  return parseHttpUrl(input) !== null;
}

export function normalizeUrl(input: string): string {
  const parsed = parseHttpUrl(input);
  if (!parsed) return input;

  // Lowercase host
  parsed.hostname = parsed.hostname.toLowerCase();

  // Normalize scheme to https
  parsed.protocol = "https:";

  // Remove trailing slash from non-root paths only
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  // Remove tracking params, preserve all others in original order
  const cleaned = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith("utm_") || lowerKey === "fbclid" || lowerKey === "ref") {
      continue;
    }
    cleaned.append(key, value);
  }

  const search = cleaned.toString();
  parsed.search = search ? `?${search}` : "";

  return parsed.toString();
}
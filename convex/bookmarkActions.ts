import { v } from "convex/values";
import { action } from "./_generated/server";

export const fetchPageTitle = action({
  args: { url: v.string() },
  handler: async (
    _ctx,
    args
  ): Promise<{ title: string; isFallback: boolean }> => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(args.url);
    } catch {
      return { title: args.url, isFallback: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let response: Response;
      try {
        response = await fetch(args.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Googlebot/2.1",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });
      } catch {
        clearTimeout(timeoutId);
        return buildFallback(parsedUrl, args.url);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        return buildFallback(parsedUrl, args.url);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType && !contentType.includes("text/html")) {
        return buildFallback(parsedUrl, args.url);
      }

      const html = await response.text();

      // Prefer richer metadata over <title>
      const ogTitle = extractMetaContent(html, "property", "og:title");
      if (isUsableFetchedTitle(ogTitle, parsedUrl)) {
        return { title: cleanFetchedTitle(ogTitle!), isFallback: false };
      }

      const twitterTitle = extractMetaContent(html, "name", "twitter:title");
      if (isUsableFetchedTitle(twitterTitle, parsedUrl)) {
        return { title: cleanFetchedTitle(twitterTitle!), isFallback: false };
      }

      const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const rawTitle = match?.[1] ?? null;
      if (isUsableFetchedTitle(rawTitle, parsedUrl)) {
        return { title: cleanFetchedTitle(rawTitle!), isFallback: false };
      }

      return buildFallback(parsedUrl, args.url);
    } catch {
      return { title: parsedUrl.hostname, isFallback: true };
    }
  },
});

function buildFallback(
  parsedUrl: URL,
  _originalUrl: string
): { title: string; isFallback: true } {
  // 1) Reddit-specific fallback
  const redditTitle = getRedditFallbackTitle(parsedUrl);
  if (redditTitle) {
    return { title: redditTitle, isFallback: true };
  }

  // 2) X / Twitter-specific fallback
  const xTitle = getXFallbackTitle(parsedUrl);
  if (xTitle) {
    return { title: xTitle, isFallback: true };
  }

  // 3) Generic path fallback (pick best segment, not full path)
  const genericTitle = getGenericPathFallback(parsedUrl);
  if (genericTitle) {
    return { title: genericTitle, isFallback: true };
  }

  // 4) Final fallback
  return { title: parsedUrl.hostname, isFallback: true };
}

// Parse Reddit format: /r/<subreddit>/comments/<postId>/<slug>
function getRedditFallbackTitle(parsedUrl: URL): string | null {
  const host = parsedUrl.hostname.toLowerCase();
  const isReddit =
    host === "reddit.com" ||
    host === "www.reddit.com" ||
    host === "old.reddit.com" ||
    host === "m.reddit.com";

  if (!isReddit) return null;

  const match = parsedUrl.pathname.match(
    /^\/r\/[^/]+\/comments\/[^/]+\/([^/]+)\/?$/i
  );

  if (!match?.[1]) return null;

  const title = humanizeSlug(match[1]);
  return title.length > 0 ? title : null;
}

// Parse X/Twitter format: /<handle>/status/<id>
function getXFallbackTitle(parsedUrl: URL): string | null {
  const host = parsedUrl.hostname.toLowerCase();
  const isX =
    host === "x.com" ||
    host === "www.x.com" ||
    host === "twitter.com" ||
    host === "www.twitter.com" ||
    host === "mobile.twitter.com";

  if (!isX) return null;

  const match = parsedUrl.pathname.match(/^\/([^/]+)\/status\/\d+\/?$/i);
  if (!match?.[1]) return null;

  const handle = decodeURIComponentSafe(match[1]).replace(/^@+/, "").trim();
  if (!handle) return null;

  return `Post by @${handle}`;
}

function getGenericPathFallback(parsedUrl: URL): string | null {
  const ignored = new Set([
    "r",
    "comments",
    "status",
    "p",
    "post",
    "posts",
    "article",
    "articles",
    "watch",
    "video",
    "videos",
    "share",
    "u",
    "user",
    "profile",
    "m",
    "www",
  ]);

  const segments = parsedUrl.pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) return null;

  const candidates = segments.filter((segment) => {
    const lower = segment.toLowerCase();
    if (ignored.has(lower)) return false;
    if (/^\d+$/.test(segment)) return false; // pure number IDs
    if (/^[a-f0-9]{16,}$/i.test(segment)) return false; // long hex-ish IDs
    return true;
  });

  const chosen =
    candidates[candidates.length - 1] ?? segments[segments.length - 1] ?? "";

  const title = humanizeSlug(chosen);
  return title.length > 0 ? title : null;
}

function extractMetaContent(
  html: string,
  attrName: "property" | "name",
  attrValue: string
): string | null {
  const escaped = escapeRegex(attrValue);

  // <meta property="og:title" content="...">
  const patternA = new RegExp(
    `<meta\\b[^>]*\\b${attrName}\\s*=\\s*["']${escaped}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i"
  );

  // <meta content="..." property="og:title">
  const patternB = new RegExp(
    `<meta\\b[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\b${attrName}\\s*=\\s*["']${escaped}["'][^>]*>`,
    "i"
  );

  const matchA = html.match(patternA);
  if (matchA?.[1]) return matchA[1];

  const matchB = html.match(patternB);
  if (matchB?.[1]) return matchB[1];

  return null;
}

function isUsableFetchedTitle(raw: string | null, parsedUrl: URL): boolean {
  if (!raw) return false;

  const title = cleanFetchedTitle(raw);
  if (!title) return false;

  const lower = title.toLowerCase();
  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  // Common useless titles
  const genericTitles = new Set([
    "x",
    "twitter",
    "reddit",
    "home",
    "login",
    "sign in",
    "just a moment...",
    "access denied",
  ]);

  if (genericTitles.has(lower)) return false;
  if (lower === host) return false;

  return true;
}

function cleanFetchedTitle(raw: string): string {
  return decodeHtmlEntities(raw)
    .replace(/\s+/g, " ")
    .trim()
    // Strip common suffixes
    .replace(/\s+[-|·]\s+(reddit|x|twitter)$/i, "")
    .replace(/\s+\/\s+(x|twitter)$/i, "")
    .trim();
}

function humanizeSlug(input: string): string {
  return decodeURIComponentSafe(input)
    .replace(/\+/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (full, num) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    })
    .replace(/&#x([0-9a-f]+);/gi, (full, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    });
}

function decodeURIComponentSafe(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
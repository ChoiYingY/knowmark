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
          headers: { "User-Agent": "Googlebot/2.1" },
        });
      } catch {
        clearTimeout(timeoutId);
        return buildFallback(parsedUrl, args.url);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        return buildFallback(parsedUrl, args.url);
      }

      const html = await response.text();
      const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

      if (match) {
        let title = match[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (title.length > 0) {
          return { title, isFallback: false };
        }
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
  const segments = parsedUrl.pathname
    .split("/")
    .filter((s) => s.length > 0);

  if (segments.length > 0) {
    const humanized = segments
      .join(" ")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { title: humanized, isFallback: true };
  }

  return { title: parsedUrl.hostname, isFallback: true };
}

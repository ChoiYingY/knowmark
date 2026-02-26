import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Internal: fetch bookmark (used by action) ────────────────────────────────
export const getBookmarkForTldr = internalQuery({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bookmarkId);
  },
});

// ─── Internal: patch TL;DR fields ────────────────────────────────────────────
export const patchTldr = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tldrText: v.string(),
    tldrUpdatedAt: v.number(),
    tldrSource: v.union(v.literal("snapshot"), v.literal("content")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookmarkId, {
      tldrText: args.tldrText,
      tldrUpdatedAt: args.tldrUpdatedAt,
      tldrSource: args.tldrSource,
    });
  },
});

// ─── Public action ────────────────────────────────────────────────────────────
export const generateBookmarkTldr = action({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args): Promise<{ ok: true; tldrText: string; cached: boolean }> => {
    // 1. Auth
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // 2. Fetch bookmark
    const doc = await ctx.runQuery(internal.tldr.getBookmarkForTldr, {
      bookmarkId: args.bookmarkId,
    });
    if (!doc) throw new ConvexError("Bookmark not found");

    // 3. Ownership check
    if (doc.userId !== userId) throw new ConvexError("Not authorized");

    // 4. Return cached TL;DR if present
    if (doc.tldrText) {
      return { ok: true, tldrText: doc.tldrText, cached: true };
    }

    // 5. Generate deterministic TL;DR from snapshot fields (no external API)
    const title = (doc.title ?? doc.url).trim();
    const summary = (doc.aiSummary ?? "").trim();
    const why = (doc.whyUseful ?? "").trim();

    let tldrText: string;
    if (summary && why) {
      tldrText = `${title} — ${summary} ${why}`;
    } else if (summary) {
      tldrText = `${title} — ${summary}`;
    } else {
      tldrText = `${title} — Saved for later reading.`;
    }

    // Trim to a reasonable length for a compact TL;DR block
    if (tldrText.length > 220) {
      tldrText = tldrText.slice(0, 217).trimEnd() + "…";
    }

    // 6. Persist
    await ctx.runMutation(internal.tldr.patchTldr, {
      bookmarkId: args.bookmarkId,
      tldrText,
      tldrUpdatedAt: Date.now(),
      tldrSource: "snapshot",
    });

    return { ok: true, tldrText, cached: false };
  },
});
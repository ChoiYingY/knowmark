import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return bookmarks.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listBookmarksWithReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return bookmarks
      .filter((b) => b.reminderAt !== null)
      .sort((a, b) => (a.reminderAt as number) - (b.reminderAt as number));
  },
});

export const getByNormalizedUrl = query({
  args: { normalizedUrl: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_normalizedUrl", (q) =>
        q.eq("userId", userId).eq("normalizedUrl", args.normalizedUrl)
      )
      .first();

    if (!bookmark) return null;

    // Return only what the Save Link preview needs for duplicate state
    return {
      _id: bookmark._id,
      url: bookmark.url,
      normalizedUrl: bookmark.normalizedUrl,
      title: bookmark.title ?? bookmark.url,
      category: bookmark.category ?? "Uncategorized",
      reminderAt: bookmark.reminderAt ?? null,
      effort: bookmark.effort ?? null,
      whyUseful: bookmark.whyUseful ?? null,
      bestTime: bookmark.bestTime ?? null,
      createdAt: bookmark.createdAt ?? null,
    };
  },
});

export const createBookmark = mutation({
  args: {
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.string(),
    aiSummary: v.string(),
    category: v.string(),
    whyUseful: v.optional(v.string()),
    bestTime: v.optional(v.string()),
    effort: v.optional(v.string()),
    reminderAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_normalizedUrl", (q) =>
        q.eq("userId", userId).eq("normalizedUrl", args.normalizedUrl)
      )
      .first();

    if (existing) {
      if (
        args.reminderAt !== undefined &&
        args.reminderAt !== existing.reminderAt
      ) {
        await ctx.db.patch(existing._id, {
          reminderAt: args.reminderAt,
          updatedAt: Date.now(),
        });
      }
      return {
        alreadyExists: true,
        existingId: existing._id,
        existingReminderAt: existing.reminderAt,
      };
    }

    const VALID_BEST_TIMES = ["today", "this_week", "weekend", "later"] as const;
    const VALID_EFFORTS = ["short", "medium", "long"] as const;

    const whyUseful =
      typeof args.whyUseful === "string" && args.whyUseful.trim().length > 0
        ? args.whyUseful.trim()
        : "Worth revisiting to explore the key ideas in more depth.";

    const argsBestTime = args.bestTime as (typeof VALID_BEST_TIMES)[number];
    const bestTime = VALID_BEST_TIMES.includes(argsBestTime)
      ? (argsBestTime)
      : "later";

    const argsEffort = args.effort as (typeof VALID_EFFORTS)[number];
    const effort = VALID_EFFORTS.includes(argsEffort)
      ? (argsEffort)
      : "medium";

    const now = Date.now();
    const newId = await ctx.db.insert("bookmarks", {
      userId,
      url: args.url,
      normalizedUrl: args.normalizedUrl,
      title: args.title,
      aiSummary: args.aiSummary,
      category: args.category,
      whyUseful,
      bestTime,
      effort,
      reminderAt: args.reminderAt ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return { alreadyExists: false, id: newId };
  },
});

export const updateReminder = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    reminderAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const doc = await ctx.db.get(args.bookmarkId);
    if (!doc) throw new ConvexError("Bookmark not found");
    if (doc.userId !== userId) throw new ConvexError("Not authorized");

    await ctx.db.patch(args.bookmarkId, {
      reminderAt: args.reminderAt,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.bookmarkId);
  },
});

export const deleteBookmark = mutation({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.bookmarkId);
    if (!doc) throw new ConvexError("Bookmark not found");
    if (doc.userId !== userId) throw new ConvexError("Not authorized");

    // Cancel any pending reminder scheduled job before deleting.
    // Failure to cancel must NOT block the delete (job may have already run or been canceled).
    if (doc.reminderScheduledId) {
      try {
        await ctx.scheduler.cancel(doc.reminderScheduledId);
      } catch (e) {
        console.log(
          "deleteBookmark: could not cancel scheduled reminder job (may have already run or been canceled)",
          args.bookmarkId,
          e
        );
      }
    }

    await ctx.db.delete(args.bookmarkId);
  },
});

export const updateBookmarkTitle = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const doc = await ctx.db.get(args.bookmarkId);
    if (!doc) throw new ConvexError("Bookmark not found");
    if (doc.userId !== userId) throw new ConvexError("Not authorized");

    const nextTitle = args.title.trim();
    if (!nextTitle) {
      throw new ConvexError("Title cannot be empty");
    }

    await ctx.db.patch(args.bookmarkId, {
      title: nextTitle,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.bookmarkId);
  },
});
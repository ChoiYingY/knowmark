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

    const result = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_normalizedUrl", (q) =>
        q.eq("userId", userId).eq("normalizedUrl", args.normalizedUrl)
      )
      .first();

    return result ?? null;
  },
});

export const createBookmark = mutation({
  args: {
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.string(),
    aiSummary: v.string(),
    category: v.string(),
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

    const now = Date.now();
    const newId = await ctx.db.insert("bookmarks", {
      userId,
      url: args.url,
      normalizedUrl: args.normalizedUrl,
      title: args.title,
      aiSummary: args.aiSummary,
      category: args.category,
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

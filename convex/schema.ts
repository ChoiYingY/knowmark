import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,
  bookmarks: defineTable({
    userId: v.string(),
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.string(),
    aiSummary: v.string(),
    category: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    reminderAt: v.union(v.number(), v.null()),
    reminderEmail: v.optional(v.string()),
    reminderStatus: v.optional(v.union(v.literal("scheduled"), v.literal("sent"), v.literal("failed"), v.literal("canceled"))),
    reminderScheduledId: v.optional(v.id("_scheduled_functions")),
    whyUseful: v.optional(v.string()),
    bestTime: v.optional(v.union(v.literal("today"), v.literal("this_week"), v.literal("weekend"), v.literal("later"))),
    effort: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_normalizedUrl", ["userId", "normalizedUrl"]),
});

export default schema;
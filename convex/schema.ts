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
  })
    .index("by_userId", ["userId"])
    .index("by_userId_normalizedUrl", ["userId", "normalizedUrl"]),
});

export default schema;
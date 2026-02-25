import { Id } from "../../convex/_generated/dataModel";

export type BookmarkCategory =
  | "AI & Tech"
  | "Career"
  | "Learning"
  | "Health"
  | "Productivity"
  | "Finance"
  | "Uncategorized";

export const BOOKMARK_CATEGORIES: BookmarkCategory[] = [
  "AI & Tech",
  "Career",
  "Learning",
  "Health",
  "Productivity",
  "Finance",
  "Uncategorized",
];

export interface Bookmark {
  _id: Id<"bookmarks">;
  _creationTime: number;
  userId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  aiSummary: string;
  category: BookmarkCategory;
  createdAt: number;
  updatedAt: number;
  reminderAt: number | null;
}

export interface BookmarkPreview {
  url: string;
  normalizedUrl: string;
  title: string;
  aiSummary: string;
  category: BookmarkCategory;
  reminderAt: number | null;
  isValid: boolean;
}

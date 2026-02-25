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

export const CATEGORY_STYLES: Record<string, string> = {
  "AI & Tech":    "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  "Career":       "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  "Learning":     "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  "Health":       "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  "Productivity": "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  "Finance":      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  "Uncategorized":"bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
};
export const NEUTRAL_CATEGORY_STYLE = "bg-muted/40 text-muted-foreground border-border";
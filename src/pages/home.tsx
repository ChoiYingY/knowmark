import { useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useNavigate } from "react-router";
import {
  addDays,
  endOfDay,
  format,
  formatDistanceToNow,
  isAfter,
  isValid,
} from "date-fns";
import { ArrowRight, BookOpen, Clock, LayoutGrid, List } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { listBookmarksQuery, listBookmarksWithRemindersQuery } from "@/services/bookmarkService";
import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";
import { BOOKMARK_CATEGORIES } from "@/types/bookmark";

type BookmarkLike = {
  _id: unknown;
  url: string;
  normalizedUrl?: string;
  title?: string | null;
  aiSummary?: string | null;
  category?: string | null;
  reminderAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
  userId?: string;
};

type FocusReason = "Due today" | "Overdue" | "This week" | "Later";

type FocusItem = {
  bookmark: BookmarkLike;
  reminderDate: Date;
  reason: FocusReason;
};

type CategoryBadgeListProps = {
  isLoading: boolean;
  topCategories: Array<[string, number]>;
  fallbackCategories: string[];
  onCategoryClick?: (category: string) => void;
};

function CategoryBadgeList({
  isLoading,
  topCategories,
  fallbackCategories,
  onCategoryClick,
}: CategoryBadgeListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    );
  }

  const hasRealData = topCategories.length > 0;

  return (
    <div className="flex flex-col items-start gap-2 pl-5 pb-5">
      {hasRealData
        ? topCategories.map(([category, count]) =>
            onCategoryClick ? (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryClick(category)}
                className="cursor-pointer"
              >
                <Badge
                  variant="secondary"
                  className="transition-colors hover:bg-secondary/80"
                >
                  {category}
                  <span className="ml-1 opacity-60">({count})</span>
                </Badge>
              </button>
            ) : (
              <Badge key={category} variant="secondary">
                {category}
                <span className="ml-1 opacity-60">({count})</span>
              </Badge>
            )
          )
        : fallbackCategories.map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="opacity-60"
            >
              {category}
              <span className="ml-1 opacity-60">(0)</span>
            </Badge>
          ))}
    </div>
  );
}

/* For home page */

function parseSafeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return isValid(date) ? date : null;
}

function normalizeCategory(category?: string | null): string {
  if (typeof category !== "string") return "Uncategorized";
  const trimmed = category.trim();
  return trimmed.length > 0 ? trimmed : "Uncategorized";
}

function displayTitle(bookmark: Pick<BookmarkLike, "title" | "url">): string {
  if (typeof bookmark.title === "string" && bookmark.title.trim().length > 0) {
    return bookmark.title.trim();
  }
  return bookmark.url;
}

function displaySummary(bookmark: Pick<BookmarkLike, "aiSummary">): string {
  if (typeof bookmark.aiSummary === "string" && bookmark.aiSummary.trim().length > 0) {
    return bookmark.aiSummary.trim();
  }
  return "A saved link to revisit later.";
}

function formatCreatedAgo(value: unknown): string {
  const date = parseSafeDate(value);
  if (!date) return "Recently";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function Dashboard() {
  useAutoAnonymousAuth();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const navigate = useNavigate();
  const [lowEnergyMode, setLowEnergyMode] = useState(false);

  const canRunQueries = isAuthenticated && !authLoading;

  // Your queries have args: {}, so pass {} when running, "skip" when not
  const bookmarksQuery = useQuery(listBookmarksQuery, canRunQueries ? {} : "skip");
  const remindersQuery = useQuery(listBookmarksWithRemindersQuery, canRunQueries ? {} : "skip");

  const isLoading =
    authLoading || bookmarksQuery === undefined || remindersQuery === undefined;

  // extra safety
  const bookmarks = Array.isArray(bookmarksQuery) ? (bookmarksQuery as BookmarkLike[]) : [];
  const reminders = Array.isArray(remindersQuery) ? (remindersQuery as BookmarkLike[]) : [];
  const hasNoBookmarks = bookmarks.length === 0;

  // Recent saves: explicitly sort by createdAt desc before slicing
  const recentSaves = bookmarks
    .slice()
    .sort((a, b) => {
      const aDate = parseSafeDate(a.createdAt);
      const bDate = parseSafeDate(b.createdAt);
      const aTs = aDate ? aDate.getTime() : 0;
      const bTs = bDate ? bDate.getTime() : 0;
      return bTs - aTs;
    })
    .slice(0, 3);

  // Categories: real counts, normalized, top 5
  const categoryCounts = bookmarks.reduce<Record<string, number>>((acc, bookmark) => {
    const key = normalizeCategory(bookmark.category);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 5);

  // Focus Now prioritization (reminder-timing only)
  const now = new Date();
  const todayEnd = endOfDay(now);
  const upcomingWeekEnd = endOfDay(addDays(now, 7));

  const dueToday: FocusItem[] = [];
  const overdue: FocusItem[] = [];
  const thisWeek: FocusItem[] = [];
  const later: FocusItem[] = [];

  reminders.forEach((bookmark) => {
    const reminderDate = parseSafeDate(bookmark.reminderAt);
    if (!reminderDate) return;

    if (isAfter(reminderDate, now) && !isAfter(reminderDate, todayEnd)) {
      dueToday.push({ bookmark, reminderDate, reason: "Due today" });
      return;
    }

    if (!isAfter(reminderDate, now)) {
      overdue.push({ bookmark, reminderDate, reason: "Overdue" });
      return;
    }

    if (isAfter(reminderDate, todayEnd) && !isAfter(reminderDate, upcomingWeekEnd)) {
      thisWeek.push({ bookmark, reminderDate, reason: "This week" });
      return;
    }

    later.push({ bookmark, reminderDate, reason: "Later" });
  });

  const sortByReminderAsc = (a: FocusItem, b: FocusItem) =>
    a.reminderDate.getTime() - b.reminderDate.getTime();

  dueToday.sort(sortByReminderAsc);
  overdue.sort(sortByReminderAsc);
  thisWeek.sort(sortByReminderAsc);
  later.sort(sortByReminderAsc);

  let focusNowItems: FocusItem[] = [...dueToday, ...overdue, ...thisWeek].slice(0, 3);
  if (focusNowItems.length === 0) {
    focusNowItems = later.slice(0, 3);
  }

  const visibleFocusItems = lowEnergyMode ? focusNowItems.slice(0, 1) : focusNowItems;
  const primaryFocusItem = visibleFocusItems[0];

  const renderReasonBadge = (reason: FocusReason) => {
    if (reason === "Overdue") {
      return (
        <Badge variant="secondary" className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5">
          {reason}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
        {reason}
      </Badge>
    );
  };

  const openBookmark = (url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal knowledge overview.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Focus Now Card */}
          <Card className="col-span-2 relative overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <CardTitle>Focus Now</CardTitle>
                  </div>
                  <CardDescription className="mt-1">
                    A gentle shortlist based on your reminder timing.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="cursor-help border-b border-muted-foreground/30 hover:border-muted-foreground/60 hover:text-foreground transition-colors"
                        onClick={(e) => e.preventDefault()}
                      >
                        Low-energy mode
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      sideOffset={8}
                      className="max-w-[180px] text-xs leading-snug"
                    >
                      Show just one item in Focus Now to reduce overwhelm.
                    </TooltipContent>
                  </Tooltip>

                  <Switch
                    checked={lowEnergyMode}
                    onCheckedChange={setLowEnergyMode}
                    aria-label="Low-energy mode"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2 rounded-lg border p-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleFocusItems.length > 0 ? (
                <div className="space-y-3">
                  {lowEnergyMode && primaryFocusItem ? (
                    <div className="space-y-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3
                            className="mb-2 line-clamp-1 text-lg font-medium leading-snug hover:underline hover:cursor-pointer"
                              onClick={() => openBookmark(primaryFocusItem.bookmark.url)}  
                          >
                            {displayTitle(primaryFocusItem.bookmark)}
                          </h3>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {displaySummary(primaryFocusItem.bookmark)}
                          </p>
                        </div>

                        <div className="shrink-0">{renderReasonBadge(primaryFocusItem.reason)}</div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">
                          {normalizeCategory(primaryFocusItem.bookmark.category)}
                        </Badge>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Clock className="h-3 w-3" />
                          {format(primaryFocusItem.reminderDate, "MMM d, h:mm a")}
                        </span>
                      </div>

                      <div className="pt-1">
                        <Button size="sm" onClick={() => openBookmark(primaryFocusItem.bookmark.url)}>
                          Read Now <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Multi-item compact list layout (default)
                    <>
                      {visibleFocusItems.map(({ bookmark, reminderDate, reason }) => (
                        <div
                          key={String(bookmark._id)}
                          className="rounded-lg border p-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <h3
                                className="line-clamp-1 text-sm font-medium leading-snug hover:underline hover:cursor-pointer"
                                onClick={() => openBookmark(bookmark.url)}
                              >
                                {displayTitle(bookmark)}
                              </h3>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {displaySummary(bookmark)}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {renderReasonBadge(reason)}
                              <span className="text-[10px] text-muted-foreground">
                                {format(reminderDate, "MMM d, h:mm a")}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {normalizeCategory(bookmark.category)}
                            </Badge>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => openBookmark(bookmark.url)}
                            >
                              Read <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>No reminders yet.</span>
                    </div>
                   <p className="text-xs">
                      {hasNoBookmarks
                        ? "Add a link to get started, then set a reminder to build your Focus to-read list."
                        : "Add reminders in your Library to build a Focus to-read list."}
                    </p>

                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate(hasNoBookmarks ? "/save" : "/library")}
                    >
                      {hasNoBookmarks ? "Add Link" : "Go to Library"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Categories</CardTitle>
              </div>
            </CardHeader>

            <CategoryBadgeList
              isLoading={isLoading}
              topCategories={topCategories}
              fallbackCategories={BOOKMARK_CATEGORIES}
              onCategoryClick={(category) =>
                navigate(`/library?category=${encodeURIComponent(category)}`)
              }
            />
          </Card>

          {/* Recent Saves Card */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Recent Saves</CardTitle>
              </div>

              <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-4 pt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSaves.length > 0 ? (
                <div className="space-y-1 pt-2">
                  {recentSaves.map((bookmark) => (
                    <div
                      key={String(bookmark._id)}
                      className="group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
                      onClick={() => openBookmark(bookmark.url)}
                    >
                      <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
                        <span className="truncate text-sm font-medium">{displayTitle(bookmark)}</span>
                        <span className="truncate text-xs text-muted-foreground">{bookmark.url}</span>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 pl-4">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {normalizeCategory(bookmark.category)}
                        </Badge>
                        <span className="w-20 text-right text-[10px] text-muted-foreground">
                          {formatCreatedAgo(bookmark.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">No recent saves yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
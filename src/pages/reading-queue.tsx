import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listBookmarksWithRemindersQuery } from "@/services/bookmarkService";
import { CATEGORY_STYLES, NEUTRAL_CATEGORY_STYLE } from "@/types/bookmark";

type TldrEntry = { status: "idle" | "loading" | "ready" | "error"; text?: string };

export default function ReadingQueuePage() {
  const navigate = useNavigate();
  const bookmarks = useQuery(listBookmarksWithRemindersQuery);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const [tldrState, setTldrState] = useState<Record<string, TldrEntry>>({});
  
  const now = Date.now();
  const OVERDUE_PREVIEW_LIMIT = 3;

  const handleTldrClick = (id: string) => {
    setTldrState(prev => ({ ...prev, [id]: { status: "loading" } }));
    setTimeout(() => {
      setTldrState(prev => ({
        ...prev,
        [id]: {
          status: "ready",
          text: "Quick recap: This link is about a topic you saved for later. (Backend will fill real content.)"
        }
      }));
    }, 700);
  };
  
  if (bookmarks === undefined) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reading Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">Links you want to read later.</p>
          </div>

          <Tabs defaultValue="reading-queue">
            <TabsList>
              <TabsTrigger value="library" onClick={() => navigate("/library")}>Library</TabsTrigger>
              <TabsTrigger value="reading-queue">Reading Queue</TabsTrigger>
            </TabsList>
          </Tabs>

          <hr className="border-t border-border -mt-6 mb-6" />

          <div className="space-y-4">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-md" />
             ))}
          </div>
        </div>
      </AppShell>
    );
  }

  type QueryBookmark = (typeof bookmarks)[number];
  type BookmarkWithReminder = QueryBookmark & { reminderAt: number };

  const hasReminder = (b: QueryBookmark): b is BookmarkWithReminder =>
    b.reminderAt !== null;

  // Grouping logic
  const bookmarkRows = bookmarks.filter(hasReminder);
  const isEmpty = bookmarkRows.length === 0;

  // calculate end of today and week first
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTodayMs = endOfToday.getTime();

  const endOfUpcomingWeek = new Date();
  endOfUpcomingWeek.setDate(endOfUpcomingWeek.getDate() + 7);
  endOfUpcomingWeek.setHours(23, 59, 59, 999);
  const endOfUpcomingWeekMs = endOfUpcomingWeek.getTime();

  // Split "Today" into actionable first + overdue second
  const todayDueLater = bookmarkRows
    .filter((b) => b.reminderAt > now && b.reminderAt <= endOfTodayMs)
    .sort((a, b) => a.reminderAt - b.reminderAt); // soonest first

  const todayOverdue = bookmarkRows
    .filter((b) => b.reminderAt <= now)
    .sort((a, b) => b.reminderAt - a.reminderAt); // most recently missed first

  const todayCount = todayDueLater.length + todayOverdue.length;

  const upcomingWeek = bookmarkRows
    .filter((b) => b.reminderAt > endOfTodayMs && b.reminderAt <= endOfUpcomingWeekMs)
    .sort((a, b) => a.reminderAt - b.reminderAt);

  const later = bookmarkRows
    .filter((b) => b.reminderAt > endOfUpcomingWeekMs)
    .sort((a, b) => a.reminderAt - b.reminderAt);

  // Collapse overdue if too much item
  const visibleOverdue = showAllOverdue
    ? todayOverdue
    : todayOverdue.slice(0, OVERDUE_PREVIEW_LIMIT);

  const hiddenOverdueCount = todayOverdue.length - visibleOverdue.length;

  // render table row w/ optional settings (only show summary for overdue ones)
  const renderRow = (b: BookmarkWithReminder, opts?: { showSummary?: boolean }) => {
    const isOverdue = b.reminderAt <= now;
    const reminderDate = new Date(b.reminderAt);
    const isCalendarToday = new Date().toDateString() === reminderDate.toDateString();
    const showSummary = opts?.showSummary ?? true;

    const tldr = tldrState[b._id] ?? { status: "idle" as const };

    let reminderEl;

    if (isOverdue) {
      reminderEl = (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Overdue</span>
          <span className="text-xs text-muted-foreground">{format(reminderDate, "h:mm a")}</span>
        </div>
      );
    } else if (isCalendarToday) {
      reminderEl = <span className="text-xs text-muted-foreground">{format(reminderDate, "h:mm a")}</span>;
    } else {
      reminderEl = <span className="text-xs text-muted-foreground">{format(reminderDate, "MMM d '·' h:mm a")}</span>;
    }

    return (
      <div key={b._id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                title={b.url ?? ""}
                className="font-medium text-foreground hover:underline line-clamp-1"
              >
                {b.title}
              </a>
            </div>
            {b.category && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap ${CATEGORY_STYLES[b.category] ?? NEUTRAL_CATEGORY_STYLE}`}>
                {b.category}
              </span>
            )}
          </div>
          {showSummary && b.aiSummary && (
            <p className="text-xs text-muted-foreground line-clamp-1">{b.aiSummary}</p>
          )}

          {/* TL;DR recap — only for overdue items */}
          {isOverdue && (
            <div className="pt-1">
              {tldr.status === "idle" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  onClick={() => handleTldrClick(b._id)}
                >
                  TL;DR recap
                </Button>
              )}

              {tldr.status === "loading" && (
                <div className="space-y-1.5 mt-1">
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              )}

              {tldr.status === "ready" && tldr.text && (
                <div className="mt-1 rounded border border-border bg-muted/40 px-2.5 py-1.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">{tldr.text}</p>
                </div>
              )}

              {tldr.status === "error" && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-destructive">Couldn't load recap.</span>
                  <button
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => handleTldrClick(b._id)}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 sm:pt-0.5">
          {reminderEl}
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reading Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Links you want to read later.</p>
        </div>

        <Tabs defaultValue="reading-queue">
          <TabsList>
            <TabsTrigger value="library" onClick={() => navigate("/library")}>Library</TabsTrigger>
            <TabsTrigger value="reading-queue">Reading Queue</TabsTrigger>
          </TabsList>
        </Tabs>

        <hr className="border-t border-border -mt-6 mb-6" />

        {isEmpty ? (
           <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
             <Clock className="h-12 w-12 text-muted-foreground/50" />
             <div className="space-y-1">
               <h3 className="font-medium text-lg">Your reading queue is empty.</h3>
               <p className="text-sm text-muted-foreground">Set a reminder on any saved link to add it here.</p>
             </div>
             <div className="flex gap-2 pt-2">
               <Button onClick={() => navigate("/save")}>Add Link</Button>
               <Button variant="outline" onClick={() => navigate("/library")}>Browse Library</Button>
             </div>
           </div>
        ) : (
           <div className="space-y-12">
             {todayCount > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  <span className="text-[8px] text-amber-400">●</span>
                  Today ({todayCount})
                </h2>

                <div className="space-y-3">
                  {/* Due later today: always visible, keep these on top */}
                  {todayDueLater.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium font-semibold text-muted-foreground px-1">
                        Due later today
                      </p>
                      {todayDueLater.map((b) => renderRow(b, { showSummary: false }))}
                    </>
                  )}

                  {/* Overdue: visible but visually secondary, collapsible */}
                  {todayOverdue.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium text-muted-foreground px-1 pt-1">
                        Overdue
                      </p>

                      {visibleOverdue.map((b) => renderRow(b, { showSummary: true }))}

                      {!showAllOverdue && hiddenOverdueCount > 0 && (
                        <button
                          onClick={() => setShowAllOverdue(true)}
                          className="w-full py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md transition-colors border border-dashed border-border flex items-center justify-center gap-1.5"
                        >
                          + {hiddenOverdueCount} more overdue
                        </button>
                      )}

                      {showAllOverdue && todayOverdue.length > OVERDUE_PREVIEW_LIMIT && (
                        <button
                          onClick={() => setShowAllOverdue(false)}
                          className="w-full py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md transition-colors border border-dashed border-border"
                        >
                          Show fewer overdue
                        </button>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

             {upcomingWeek.length > 0 && (
               <section>
                 <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                   <span className="text-[8px] text-blue-400">●</span>
                   Upcoming Week ({upcomingWeek.length})
                 </h2>
                 <div className="space-y-3">
                    {upcomingWeek.map((b) => renderRow(b, { showSummary: false }))}
                 </div>
               </section>
             )}

             {later.length > 0 && (
               <section>
                  <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    <span className="text-[8px] text-muted-foreground/50">●</span>
                    Later ({later.length})
                  </h2>
                  <div className="space-y-3">
                    {later.map((b) => renderRow(b, { showSummary: false }))}
                  </div>
                </section>
             )}
           </div>
        )}
      </div>
    </AppShell>
  );
}

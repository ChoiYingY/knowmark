import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { listBookmarksWithRemindersQuery } from "@/services/bookmarkService";
import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";

export default function ReadingQueuePage() {
  useAutoAnonymousAuth();
  const navigate = useNavigate();
  const bookmarks = useQuery(listBookmarksWithRemindersQuery);
  const [showAllToday, setShowAllToday] = useState(false);

  const now = Date.now();
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const TODAY_LIMIT = 5;

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

  // Grouping logic
  const today = bookmarks
    .filter(b => b.reminderAt! <= now)
    .sort((a, b) => b.reminderAt! - a.reminderAt!); // Descending

  const upcoming = bookmarks.filter(b => b.reminderAt! > now && b.reminderAt! <= sevenDaysFromNow);
  const later = bookmarks.filter(b => b.reminderAt! > sevenDaysFromNow);

  const isEmpty = bookmarks.length === 0;

  const renderRow = (b: any) => {
    const isOverdue = b.reminderAt! < now;
    const reminderDate = new Date(b.reminderAt!);
    const isCalendarToday = new Date().toDateString() === reminderDate.toDateString();

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
       // Upcoming or Later
       reminderEl = <span className="text-xs text-muted-foreground">{format(reminderDate, "MMM d '·' h:mm a")}</span>;
    }

    return (
       <div key={b._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
          <div className="space-y-1.5 min-w-0">
             <div className="flex items-center gap-2">
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm truncate hover:underline">{b.title}</a>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                  {b.category}
                </span>
             </div>
             {b.aiSummary && (
               <p className="text-xs text-muted-foreground line-clamp-1">{b.aiSummary}</p>
             )}
          </div>
          
          <div className="flex-shrink-0">
             {reminderEl}
          </div>
       </div>
    );
  }

  const visibleToday = showAllToday ? today : today.slice(0, TODAY_LIMIT);
  const hiddenCount = today.length - visibleToday.length;

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
             {today.length > 0 && (
               <section>
                 <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                   <span className="text-[8px] text-amber-400">●</span>
                   Today
                 </h2>
                 <div className="space-y-3">
                   {visibleToday.map(renderRow)}
                   {!showAllToday && hiddenCount > 0 && (
                     <button 
                       onClick={() => setShowAllToday(true)}
                       className="w-full py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md transition-colors border border-dashed border-border flex items-center justify-center gap-1.5"
                     >
                       + {hiddenCount} earlier reminders
                     </button>
                   )}
                 </div>
               </section>
             )}

             {upcoming.length > 0 && (
               <section>
                 <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                   <span className="text-[8px] text-blue-400">●</span>
                   Upcoming
                 </h2>
                 <div className="space-y-3">
                   {upcoming.map(renderRow)}
                 </div>
               </section>
             )}

             {later.length > 0 && (
               <section>
                 <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                   <span className="text-[8px] text-muted-foreground/50">●</span>
                   Later
                 </h2>
                 <div className="space-y-3">
                   {later.map(renderRow)}
                 </div>
               </section>
             )}
           </div>
        )}
      </div>
    </AppShell>
  );
}

import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BookOpen, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReminderPopover } from "@/components/ui/ReminderPopover";
import { listBookmarksQuery, updateReminderMutation } from "@/services/bookmarkService";
import { BOOKMARK_CATEGORIES } from "@/types/bookmark";
import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";
import { useAppToast } from "@/hooks/useAppToast";

export default function Library() {
  const { isAuthReady } = useAutoAnonymousAuth();
  const { showToast } = useAppToast();
  const navigate = useNavigate();

  const bookmarks = useQuery(listBookmarksQuery); // undefined = loading, [] = empty
  const updateReminder = useMutation(updateReminderMutation);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => searchParams.get("category") ?? "All"
  );

  useEffect(() => {
    const qFromUrl = searchParams.get("q") ?? "";
    const categoryFromUrl = searchParams.get("category") ?? "All";

    setSearchQuery(qFromUrl);
    setCategoryFilter(categoryFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();

    const trimmedQ = searchQuery.trim();
    if (trimmedQ) next.set("q", trimmedQ);

    if (categoryFilter !== "All") next.set("category", categoryFilter);

    setSearchParams(next, { replace: true });
  }, [searchQuery, categoryFilter, setSearchParams]);

  if (!isAuthReady) {
    showToast("Signing you in… please try again in a second.", "info");
    return;
  }

  const filtered = (bookmarks ?? []).filter((b) => {
    const title = (b.title ?? "").toLowerCase();
    const summary = (b.aiSummary ?? "").toLowerCase();
    const url = (b.url ?? "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query || title.includes(query) || summary.includes(query) || url.includes(query);

    const category = b.category ?? "Uncategorized";
    const matchesCategory = categoryFilter === "All" || category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const isLoading = bookmarks === undefined;
  const isEmpty = bookmarks !== undefined && bookmarks.length === 0;
  const isNoResults = !isEmpty && filtered.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground mt-1">All your saved links, organized.</p>
        </div>

        <Tabs defaultValue="library" className="w-full">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="reading-queue" onClick={() => navigate("/reading-queue")}>
              Reading Queue
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <hr className="border-t border-border -mt-6 mb-6" />

        {/* Search + filter bar */}
        {!isEmpty && (
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 h-8 w-full rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="All">All categories</option>
              {BOOKMARK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-muted/30 animate-pulse rounded-md" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">Your library is empty.</h3>
            <p className="text-sm text-muted-foreground">Start by adding your first link.</p>
            <Button onClick={() => navigate("/save")} className="mt-4">
              Add your first link
            </Button>
          </div>
        ) : isNoResults ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No results found for your search.</p>
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(""); setCategoryFilter("All"); }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left py-2.5 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[35%]">Title</th>
                  <th scope="col" className="text-left py-2.5 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Summary</th>
                  <th scope="col" className="text-left py-2.5 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[110px]">Category</th>
                  <th scope="col" className="text-left py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide w-[160px]">Remind</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bookmark) => (
                  <tr key={bookmark._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                    <td className="py-3 pr-4">
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
                         className="font-medium text-foreground hover:underline line-clamp-1">
                        {bookmark.title}
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{bookmark.url}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">{bookmark.aiSummary}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {bookmark.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <ReminderPopover
                        variant="compact"
                        reminderAt={bookmark.reminderAt}
                        onChange={async (value) => {
                          try {
                            await updateReminder({ bookmarkId: bookmark._id, reminderAt: value });
                          } catch {
                            toast.error("Failed to update reminder. Please try again.", { id: "library-reminder" });
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
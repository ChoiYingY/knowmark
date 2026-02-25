import { useQuery, useMutation } from "convex/react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BookOpen, Search, X, ChevronDown, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReminderPopover } from "@/components/ui/ReminderPopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  listBookmarksQuery,
  deleteBookmarkMutation,
  updateBookmarkTitleMutation,
  scheduleReminderEmailMutation,
  cancelReminderEmailMutation,
} from "@/services/bookmarkService";
import { BOOKMARK_CATEGORIES } from "@/types/bookmark";

type SortOrder = "added-desc" | "added-asc" | "reminder-asc" | "reminder-desc";

const SORT_LABELS: Record<SortOrder, string> = {
  "added-desc": "Added ↓",
  "added-asc": "Added ↑",
  "reminder-asc": "Reminder ↓",
  "reminder-desc": "Reminder ↑",
};

const VALID_SORTS: SortOrder[] = ["added-desc", "added-asc", "reminder-asc", "reminder-desc"];

export default function Library() {
  const navigate = useNavigate();

  const bookmarks = useQuery(listBookmarksQuery);
  const deleteBookmark = useMutation(deleteBookmarkMutation);
  const updateBookmarkTitle = useMutation(updateBookmarkTitleMutation);
  const scheduleReminderEmail = useMutation(scheduleReminderEmailMutation);
  const cancelReminderEmail = useMutation(cancelReminderEmailMutation);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => searchParams.get("category") ?? "All"
  );

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const sortFromUrl = searchParams.get("sort") as SortOrder | null;
    return sortFromUrl && VALID_SORTS.includes(sortFromUrl) ? sortFromUrl : "added-desc";
  });

  // Delete modal state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline title edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // determine email existence
  const [defaultReminderEmail, setDefaultReminderEmail] = useState("");
  const canScheduleReminder = defaultReminderEmail.trim().length > 0;

  useEffect(() => {
    try {
      setDefaultReminderEmail(localStorage.getItem("defaultReminderEmail") ?? "");
    } catch {
      setDefaultReminderEmail("");
    }
  }, []);

  useEffect(() => {
    const qFromUrl = searchParams.get("q") ?? "";
    const categoryFromUrl = searchParams.get("category") ?? "All";
    const sortFromUrl = searchParams.get("sort") as SortOrder | null;

    setSearchQuery(qFromUrl);
    setCategoryFilter(categoryFromUrl);
    setSortOrder(sortFromUrl && VALID_SORTS.includes(sortFromUrl) ? sortFromUrl : "added-desc");
  }, [searchParams]);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();

    const trimmedQ = searchQuery.trim();
    if (trimmedQ) next.set("q", trimmedQ);

    if (categoryFilter !== "All") next.set("category", categoryFilter);
    if (sortOrder !== "added-desc") next.set("sort", sortOrder);

    setSearchParams(next, { replace: true });
  }, [searchQuery, categoryFilter, sortOrder, setSearchParams]);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteBookmark({ bookmarkId: pendingDeleteId as any });
      setPendingDeleteId(null);
    } catch {
      toast.error("Failed to delete bookmark. Please try again.", { id: "library-delete" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!editingId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) return;
    setIsSavingTitle(true);
    try {
      await updateBookmarkTitle({ bookmarkId: editingId as any, title: trimmed });
      setEditingId(null);
      setEditingTitle("");
    } catch {
      toast.error("Failed to update title. Please try again.", { id: "library-title-edit" });
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

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

  const sorted = (() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      if (sortOrder === "added-desc") {
        return b._creationTime - a._creationTime;
      }
      if (sortOrder === "added-asc") {
        return a._creationTime - b._creationTime;
      }
      if (sortOrder === "reminder-asc") {
        const aR = a.reminderAt;
        const bR = b.reminderAt;
        if (aR !== null && bR !== null) return (aR ?? 0) - (bR ?? 0);
        if (aR !== null) return -1;
        if (bR !== null) return 1;
        return b._creationTime - a._creationTime;
      }
      if (sortOrder === "reminder-desc") {
        const aR = a.reminderAt;
        const bR = b.reminderAt;
        if (aR !== null && bR !== null) return (bR ?? 0) - (aR ?? 0);
        if (aR !== null) return -1;
        if (bR !== null) return 1;
        return b._creationTime - a._creationTime;
      }
      return 0;
    });
  })();

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
          <div className="flex items-center justify-between pr-3 gap-3">
            {/* Search input */}
            <div className="relative flex-1 max-w-m">
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
            
            <div className="flex items-center justify-between gap-4">
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
              
              {/* Sort dropdown */}
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span>Sort: {SORT_LABELS[sortOrder]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isSortOpen && (
                  <div className="absolute right-0 mt-1 w-36 rounded-md border border-border bg-background shadow-md py-1 z-50">
                    {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortOrder(key);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors ${
                          sortOrder === key ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                  <th scope="col" className="w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((bookmark) => {
                  const isEditing = editingId === bookmark._id;
                  const trimmedEdit = editingTitle.trim();

                  return (
                    <tr key={bookmark._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                      {/* Title cell — normal or edit mode */}
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingTitle}
                              autoFocus
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && trimmedEdit) handleSaveTitle();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="flex-1 h-7 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground min-w-0"
                            />
                            <button
                              type="button"
                              onClick={handleSaveTitle}
                              disabled={!trimmedEdit || isSavingTitle}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isSavingTitle}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1 group/title">
                            <div className="min-w-0 flex-1">
                              <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={bookmark.url ?? ""}
                                className="font-medium text-foreground hover:underline line-clamp-1"
                              >
                                {bookmark.title}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(bookmark._id);
                                setEditingTitle(bookmark.title ?? "");
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex-shrink-0 mt-0.5"
                              title="Edit title"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
                        <div className="flex flex-col gap-0.5 items-start">
                          {
                            (!canScheduleReminder && !bookmark.reminderAt) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-not-allowed">
                                    <ReminderPopover
                                      disabled
                                      variant="compact"
                                      reminderAt={bookmark.reminderAt}
                                      status={bookmark.reminderStatus ?? null}
                                      onChange={async () => { }}
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                  Set a reminder email in Dashboard first
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <ReminderPopover
                                variant="compact"
                                reminderAt={bookmark.reminderAt}
                                status={bookmark.reminderStatus ?? null}
                                onChange={async (value) => {
                                  try {
                                    if (value !== null) {
                                      if (!defaultReminderEmail) {
                                        toast.error("No default reminder email set. Please set one in Dashboard.", { id: "library-reminder" });
                                        return;
                                      }
                                      await scheduleReminderEmail({
                                        bookmarkId: bookmark._id,
                                        reminderAt: value,
                                        reminderEmail: defaultReminderEmail,
                                      });
                                    } else {
                                      await cancelReminderEmail({ bookmarkId: bookmark._id });
                                    }
                                  } catch {
                                    toast.error("Failed to update reminder. Please try again.", { id: "library-reminder" });
                                  }
                                }}
                              />
                            )
                          }
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(bookmark._id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {pendingDeleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-foreground">Delete bookmark?</h2>
            <p className="text-sm text-muted-foreground mt-1.5">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingDeleteId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

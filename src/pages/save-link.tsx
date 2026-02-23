import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { CalendarDays, Sparkles, X } from "lucide-react";
import { isValidUrl, normalizeUrl } from "@/utils/urlNormalize";
import {
  fetchPageTitleAction,
  createBookmarkMutation,
} from "@/services/bookmarkService";
import type { BookmarkPreview } from "@/types/bookmark";
import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; data: BookmarkPreview }
  | { status: "invalid" };

const MOCK_SUMMARY = "A useful resource saved for later reading.";
const TOAST_ID = "save-link";

// ─── Reminder Popover Component ───────────────────────────────────────────────

interface ReminderPopoverProps {
  reminderAt: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

function ReminderPopover({ reminderAt, onChange, disabled }: ReminderPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

  // Sync state when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (reminderAt) {
        const d = new Date(reminderAt);
        setSelectedDay(d);
        let h = d.getHours();
        const m = d.getMinutes();
        const isPm = h >= 12;
        
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;

        setHour(h.toString());
        setMinute(m.toString().padStart(2, "0"));
        setAmpm(isPm ? "PM" : "AM");
      } else {
        // Defaults if fresh open
        setSelectedDay(undefined);
        setHour("9");
        setMinute("00");
        setAmpm("AM");
      }
    }
    setOpen(newOpen);
  };

  const handleSetReminder = () => {
    if (!selectedDay) return;

    const h24 = ampm === "AM"
      ? (parseInt(hour) % 12)
      : (parseInt(hour) % 12) + 12;
    const d = new Date(selectedDay);
    d.setHours(h24, parseInt(minute), 0, 0);
    
    onChange(d.getTime());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  const handleQuickDate = (daysToAdd: number) => {
    setSelectedDay(addDays(new Date(), daysToAdd));
    setHour("9");
    setMinute("00");
    setAmpm("AM");
  };

  const isTomorrow = (day: Date | undefined) => {
    if (!day) return false;
    return format(day, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd');
  };

  const isNextWeek = (day: Date | undefined) => {
    if (!day) return false;
    return format(day, 'yyyy-MM-dd') === format(addDays(new Date(), 7), 'yyyy-MM-dd');
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
          disabled={disabled}
        >
          {reminderAt ? (
            <>
              <span>{format(new Date(reminderAt), "MMM d, h:mm a")}</span>
              <div 
                role="button"
                onClick={handleClear}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background/50"
              >
                <X size={10} />
              </div>
            </>
          ) : (
            <>
              <CalendarDays size={12} />
              <span>Remind me</span>
            </>
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-72 rounded-lg border border-border bg-card shadow-lg p-3 space-y-3" 
          sideOffset={8} 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickDate(1)}
              className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                isTomorrow(selectedDay) 
                  ? "bg-accent text-accent-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => handleQuickDate(7)}
              className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                isNextWeek(selectedDay)
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              Next week
            </button>
          </div>

          {/* Calendar */}
          <div className="flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              disabled={{ before: new Date() }}
              showOutsideDays={false}
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium text-foreground",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded hover:bg-accent",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem] text-center",
                row: "flex w-full mt-1",
                cell: "h-8 w-8 text-center text-sm p-0 relative",
                day: "h-8 w-8 p-0 font-normal text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "ring-1 ring-primary/30 font-medium",
                day_outside: "opacity-30",
                day_disabled: "opacity-30 pointer-events-none",
              }}
            />
          </div>

          {/* Time Selection */}
          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground mr-1">Time</span>
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3rem]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-muted-foreground">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3rem]"
            >
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={(e) => setAmpm(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3.5rem]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={handleSetReminder}
              disabled={!selectedDay}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Set reminder
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SaveLink() {
  useAutoAnonymousAuth();

  const navigate = useNavigate();
  const fetchTitle = useAction(fetchPageTitleAction);
  const createBookmark = useMutation(createBookmarkMutation);

  const [inputValue, setInputValue] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [reminderAt, setReminderAt] = useState<number | null>(null);

  // Ref to dedupe rapid toast calls
  const lastToastMsg = useRef<string>("");

  const isPreviewing = preview.status === "loading";
  const isPreviewValid = preview.status === "valid";

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handlePreview() {
    const raw = inputValue.trim();
    if (!raw) return;

    if (!isValidUrl(raw)) {
      setPreview({ status: "invalid" });
      showToast("Invalid link", "error");
      return;
    }

    setPreview({ status: "loading" });

    try {
      const normalizedUrl = normalizeUrl(raw);
      const result = await fetchTitle({ url: raw });

      setInputValue(""); // clear only on success
      setPreview({
        status: "valid",
        data: {
          url: raw,
          normalizedUrl,
          title: result.title,
          aiSummary: MOCK_SUMMARY,
          category: "Uncategorized",
          reminderAt: null,
          isValid: true,
        },
      });
    } catch {
      // Network / action failure — treat as invalid for now
      setPreview({ status: "invalid" });
      showToast("Could not fetch preview. Check the link and try again.", "error");
    }
  }

  async function handleSave() {
    if (preview.status !== "valid") return;

    setIsSaving(true);

    try {
      const result = await createBookmark({
        url: preview.data.url,
        normalizedUrl: preview.data.normalizedUrl,
        title: preview.data.title,
        aiSummary: preview.data.aiSummary,
        category: preview.data.category,
        reminderAt: reminderAt ?? undefined,
      });

      if (result.alreadyExists) {
        showToast("Already saved — keeping existing reminder.", "info");
        setIsSaving(false);
        return;
      }

      showToast("Saved to your library!", "success");
      navigate("/library");
    } catch {
      showToast("Failed to save. Please try again.", "error");
      setIsSaving(false);
    }
  }

  function handleCancel() {
    navigate(-1);
  }

  // ─── Toast helper (deduplicates rapid repeated messages) ────────────────────
  function showToast(msg: string, type: "success" | "error" | "info") {
    if (lastToastMsg.current === msg) {
      // Replace existing toast rather than stacking
      toast.dismiss(TOAST_ID);
    }
    lastToastMsg.current = msg;

    const opts = { id: TOAST_ID };
    if (type === "success") toast.success(msg, opts);
    else if (type === "error") toast.error(msg, opts);
    else toast(msg, opts);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Add Link
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste an article link to save it to your library.
          </p>
        </div>

        {/* URL input */}
        <div className="space-y-2">
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Paste a link here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isPreviewing || isSaving}
            onKeyDown={(e) => {
              // Allow Ctrl/Cmd+Enter to trigger preview
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                if (!isPreviewing && !isSaving && inputValue.trim()) {
                  void handlePreview();
                }
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              We'll fetch the title and help you remember why you saved it.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={isPreviewing || isSaving || !inputValue.trim()}
            >
              {isPreviewing ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Fetching…
                </span>
              ) : (
                "Preview"
              )}
            </Button>
          </div>
        </div>

        {/* Preview area */}
        {preview.status === "idle" && (
          <div className="min-h-[120px] border border-dashed border-border rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Preview will appear here after clicking Preview
            </p>
          </div>
        )}

        {preview.status === "loading" && (
          <div className="min-h-[120px] border border-dashed border-border rounded-lg flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Fetching link…</p>
          </div>
        )}

        {preview.status === "invalid" && (
          <div className="rounded-lg border-2 border-destructive/50 bg-background px-4 py-4">
            <p className="text-sm text-destructive font-medium">
              This doesn't look like a valid link
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure the URL starts with http:// or https:// and try again.
            </p>
          </div>
        )}

        {preview.status === "valid" && (
          <div className="relative rounded-lg border border-border bg-card px-5 py-4 space-y-3">
            <button
              onClick={() => { setPreview({ status: "idle" }); setReminderAt(null); }}
              className="absolute top-2.5 right-2.5 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Clear preview"
            >
              <X size={12} />
            </button>

            {/* Title — prominent, no label above it */}
            <p className="text-sm font-semibold text-foreground leading-snug pr-6">
              {preview.data.title}
            </p>

            {/* AI Summary Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-muted-foreground/70" />
                <span className="text-[11px] text-muted-foreground/70 font-medium tracking-wide">AI-generated summary</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {preview.data.aiSummary}
              </p>
            </div>

            {/* Category Row */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {preview.data.category}
              </span>
            </div>

            {/* Reminder Row */}
            <div className="flex items-center gap-2">
              <ReminderPopover
                reminderAt={reminderAt}
                onChange={setReminderAt}
                disabled={isSaving}
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isPreviewValid || isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Saving…
              </span>
            ) : (
              "Save to Library"
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

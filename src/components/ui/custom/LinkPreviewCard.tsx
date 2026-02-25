import { AlertTriangle, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReminderPopover } from "@/components/ui/ReminderPopover";
import { CATEGORY_STYLES, NEUTRAL_CATEGORY_STYLE } from "@/types/bookmark";
import { Skeleton } from "@/components/ui/skeleton";
import { EffortChip } from "./EffortChip";

export interface LinkPreviewCardProps {
  mode: "loading" | "ready";
  // loading mode only:
  rawUrl?: string;
  // ready mode:
  title?: string;
  aiSummary?: string;
  category?: string;
  isDuplicate?: boolean;
  isSaving?: boolean;
  reminderAt?: number | null;
  onReminderChange?: (value: number | null) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  showReminder?: boolean;
  showSummary?: boolean;
  effort?: string | null;
}

export function LinkPreviewCard(props: LinkPreviewCardProps) {
  const {
    mode,
    rawUrl,
    title,
    aiSummary,
    category,
    isDuplicate,
    isSaving,
    reminderAt,
    onReminderChange,
    onClear,
    showClearButton,
    showReminder,
    showSummary,
    effort,
  } = props;

  if (mode === "loading") {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1 overflow-hidden">
             <Skeleton className="h-4 w-3/4" />
             {rawUrl && (
               <p className="truncate text-xs text-muted-foreground">{rawUrl}</p>
             )}
          </div>
        </div>
        <div className="space-y-2 pt-2">
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-4 shadow-sm transition-all",
        isDuplicate ? "border-yellow-400/70" : "border-border"
      )}
    >
      {showClearButton && onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClear}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="space-y-3">
        {/* Duplicate Banner */}
        {isDuplicate && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-yellow-50 p-2 text-yellow-800 border border-yellow-200/50">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">
              Already saved - you can update the reminder below
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight">
          {title}
        </h3>

        {/* AI Summary */}
        {showSummary && aiSummary && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span className="font-medium text-purple-600/90 dark:text-purple-400/90">
                AI Summary
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground italic">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Footer: Category + Effort + Reminder */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {category && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                CATEGORY_STYLES[category] ?? NEUTRAL_CATEGORY_STYLE
              }`}
            >
              {category}
            </span>
          )}

          <EffortChip effort={effort}/>

          {showReminder && onReminderChange && (
            <div className="ml-auto">
               <ReminderPopover
                 reminderAt={reminderAt ?? null}
                 onChange={onReminderChange}
                 disabled={isSaving}
                 variant="detailed"
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { ReminderPopover } from "@/components/ui/ReminderPopover";

type LinkPreviewCardBaseProps = {
  className?: string;
};

type LoadingCardProps = LinkPreviewCardBaseProps & {
  mode: "loading";
  rawUrl: string;
};

type CardTone = "default" | "green" | "yellow" | "red" | "orange";

type ReadyCardProps = LinkPreviewCardBaseProps & {
  mode: "ready";
  title: string;
  aiSummary: string;
  category: string;

  // existing
  isDuplicate?: boolean;
  isSaving?: boolean;
  reminderAt?: number | null;
  onReminderChange?: (value: number | null) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  showReminder?: boolean;
  topContent?: ReactNode;

  borderTone?: CardTone;
  showSummary?: boolean;
  showCategory?: boolean;
};

export type LinkPreviewCardProps = LoadingCardProps | ReadyCardProps;

export function LinkPreviewCard(props: LinkPreviewCardProps) {
  if (props.mode === "loading") {
    return (
      <div className={`rounded-xl border border-border/50 bg-muted/20 px-4 py-3 ${props.className ?? ""}`}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin"
          />
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="font-medium text-muted-foreground/80">Processing </span>
            <span className="truncate inline-block max-w-[420px] align-bottom">
              {props.rawUrl || "link..."}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const {
    title,
    aiSummary,
    category,
    isDuplicate = false,
    isSaving = false,
    reminderAt = null,
    onReminderChange,
    onClear,
    showClearButton = true,
    showReminder = true,
    topContent,
    className,
  } = props;

  return (
    <div
      className={`relative rounded-lg border-2 bg-card px-5 py-4 space-y-2.5 ${
        isDuplicate ? "border-yellow-400/70" : "border-border"
      } ${className ?? ""}`}
    >
      {showClearButton && onClear && (
        <button
          onClick={onClear}
          className="absolute top-2.5 right-2.5 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Clear preview"
        >
          <X size={12} />
        </button>
      )}

      {/* Optional slot for future bulk status row/badge */}
      {topContent}

      {isDuplicate && (
        <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50 px-3 py-2.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-500" />
          <div>
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400">
              Already in your library
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-500/80 mt-0.5">
              This link is already saved. Existing reminder will be kept.
            </p>
          </div>
        </div>
      )}

      <p className="pr-6 text-[15px] font-semibold leading-snug text-foreground">
        {title}
      </p>

      <div className="rounded-md bg-muted/25 px-3 py-2">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles size={11} className="text-muted-foreground/70" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI-generated summary
          </span>
        </div>
        <p className="text-sm leading-6 text-foreground/80">
          {aiSummary}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {category}
        </span>

        {showReminder && onReminderChange && (
          <ReminderPopover
            reminderAt={reminderAt}
            onChange={onReminderChange}
            disabled={isSaving}
            variant="detailed"
          />
        )}
      </div>
    </div>
  );
}
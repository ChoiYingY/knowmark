import type { ReactNode } from "react";
import type { BookmarkCategory } from "@/types/bookmark";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileX2,
  Loader2,
  X,
} from "lucide-react";

export type BulkLineStatus =
  | "processing"
  | "ready"
  | "duplicate"
  | "invalid"
  | "error"
  | "saving"
  | "saved";

export type BulkLineReason =
  | "already_saved"
  | "duplicate_in_paste"
  | "invalid_url"
  | "fetch_failed"
  | "save_failed";

export interface BulkLineResult {
  originalLine: string;
  normalizedUrl?: string;
  title?: string;
  aiSummary?: string;
  category?: BookmarkCategory;
  status: BulkLineStatus;
  reason?: BulkLineReason;
}

export interface BulkImportResult {
  ready: number;
  duplicates: number;
  invalid: number;
  errors: number;
}

interface BulkLinkPreviewCardProps {
  item: BulkLineResult;
  onRemove?: () => void;
  disableRemove?: boolean;
}

type StatusConfig = {
  badgeLabel: string;
  message: string;
  icon: ReactNode;
  cardClasses: string;
  badgeClasses: string;
};

function getStatusConfig(
  status: BulkLineStatus,
  reason?: BulkLineReason
): StatusConfig {
  switch (status) {
    case "processing":
      return {
        badgeLabel: "Processing",
        message: "Preparing preview…",
        icon: <Loader2 size={12} className="animate-spin" />,
        cardClasses: "border-border bg-card",
        badgeClasses: "bg-muted text-muted-foreground",
      };

    case "ready":
      return {
        badgeLabel: "Ready to save",
        message: "",
        icon: <CheckCircle2 size={12} />,
        cardClasses:
          "border-green-200 bg-green-50/40 dark:border-green-800/40 dark:bg-green-950/10",
        badgeClasses:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      };

    case "duplicate":
      return {
        badgeLabel:
          reason === "duplicate_in_paste"
            ? "Duplicate in pasted list"
            : "Already in library",
        message:
          reason === "duplicate_in_paste"
            ? "Skipped in preview because this link appears more than once."
            : "Skipped in preview because this link already exists in your library.",
        icon: <Copy size={12} />,
        cardClasses:
          "border-yellow-200 bg-yellow-50/40 dark:border-yellow-800/40 dark:bg-yellow-950/10",
        badgeClasses:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      };

    case "invalid":
      return {
        badgeLabel: "Invalid URL",
        message: "Skipped in preview. Make sure the link starts with http:// or https://.",
        icon: <FileX2 size={12} />,
        cardClasses: "border-destructive/30 bg-destructive/5",
        badgeClasses: "bg-destructive/10 text-destructive",
      };

    case "error":
      return {
        badgeLabel: "Preview error",
        message: "Could not preview this link. You can retry.",
        icon: <AlertCircle size={12} />,
        cardClasses:
          "border-orange-200 bg-orange-50/40 dark:border-orange-800/40 dark:bg-orange-950/10",
        badgeClasses:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      };

    case "saving":
      return {
        badgeLabel: "Saving",
        message: "Saving this link to your library…",
        icon: <Loader2 size={12} className="animate-spin" />,
        cardClasses: "border-border bg-card",
        badgeClasses: "bg-muted text-muted-foreground",
      };

    case "saved":
      return {
        badgeLabel: "Saved",
        message: "Saved to your library.",
        icon: <CheckCircle2 size={12} />,
        cardClasses:
          "border-green-200 bg-green-50/40 dark:border-green-800/40 dark:bg-green-950/10",
        badgeClasses:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      };
  }
}

export function BulkLinkPreviewCard({
  item,
  onRemove,
  disableRemove,
}: BulkLinkPreviewCardProps) {
  const c = getStatusConfig(item.status, item.reason);
  const title = item.title ?? item.originalLine;
  const showUrlLine = Boolean(item.title && item.title !== item.originalLine);

  return (
    <div className={`relative rounded-lg border px-4 py-3 ${c.cardClasses}`}>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disableRemove}
          className="absolute top-2 right-2 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Remove from bulk preview"
        >
          <X size={14} />
        </button>
      )}

      <div className="pr-8">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.badgeClasses}`}
        >
          {c.icon}
          {c.badgeLabel}
        </span>

        <p className="mt-2 text-sm font-medium text-foreground break-words">
          {title}
        </p>

        {showUrlLine && (
          <p className="mt-1 text-xs text-muted-foreground break-all" title={item.originalLine}>
            {item.originalLine}
          </p>
        )}

        {c.message ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{c.message}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Optional: keep this export only if your SaveLink page still uses <BulkStatusBanner /> somewhere.
 * You can delete this later once fully migrated to BulkLinkPreviewCard.
 */
export function BulkStatusBanner({ item }: { item: BulkLineResult }) {
  if (item.status === "processing") return null;

  const c = getStatusConfig(item.status, item.reason);

  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 ${c.cardClasses}`}>
      <span className="mt-0.5 shrink-0">{c.icon}</span>
      <div>
        <p className="text-xs font-medium">{c.badgeLabel}</p>
        <p className="text-xs opacity-80 mt-0.5">{c.message}</p>
      </div>
    </div>
  );
}
import {
  CheckCircle2,
  X,
  AlertTriangle,
  AlertCircle,
  FileX2,
  Link,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_STYLES, NEUTRAL_CATEGORY_STYLE } from "@/types/bookmark";

// Matches BulkLineResult in save-link.tsx
export interface BulkLineItem {
  originalLine: string;
  normalizedUrl?: string;
  title?: string;
  aiSummary?: string;
  category?: string;
  status:
    | "processing"
    | "ready"
    | "duplicate"
    | "invalid"
    | "error"
    | "saving"
    | "saved";
  reason?:
    | "already_saved"
    | "duplicate_in_paste"
    | "invalid_url"
    | "fetch_failed"
    | "save_failed";
}

export interface BulkImportResult {
  ready: number;
  duplicates: number;
  invalid: number;
  errors: number;
}

interface BulkLinkPreviewCardProps {
  item: BulkLineItem;
  onRemove: () => void;
  disableRemove?: boolean;
}

export function BulkLinkPreviewCard({
  item,
  onRemove,
  disableRemove,
}: BulkLinkPreviewCardProps) {
  const { status, originalLine, title, category, reason } = item;

  // Processing
  if (status === "processing") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="flex-1 truncate text-sm text-muted-foreground">
          {originalLine}
        </span>
      </div>
    );
  }

  // Invalid
  if (status === "invalid") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 shadow-sm">
        <FileX2 className="h-4 w-4 shrink-0 text-destructive" />
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-destructive">
            {originalLine}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              Invalid URL
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          disabled={disableRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 shadow-sm dark:border-orange-900/30 dark:bg-orange-900/10">
        <AlertCircle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-orange-700 dark:text-orange-300">
            {originalLine}
          </p>
          <Badge
            variant="outline"
            className="h-5 border-orange-200 bg-orange-100 px-1.5 text-[10px] text-orange-700 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
          >
            Fetch Failed
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-orange-600 hover:bg-orange-100 hover:text-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/30"
          onClick={onRemove}
          disabled={disableRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Duplicate
  if (status === "duplicate") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 shadow-sm dark:border-yellow-900/30 dark:bg-yellow-900/10">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {title || originalLine}
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-5 border-yellow-200 bg-yellow-100 px-1.5 text-[10px] text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
            >
              Duplicate
            </Badge>
            <span className="truncate text-xs text-yellow-700/80 dark:text-yellow-400/80">
              {reason === "already_saved"
                ? "Already in library"
                : "Duplicate in paste"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
          onClick={onRemove}
          disabled={disableRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Saving
  if (status === "saving") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {title || originalLine}
          </p>
          <p className="text-xs text-muted-foreground">Saving...</p>
        </div>
      </div>
    );
  }

  // Saved
  if (status === "saved") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm dark:border-green-900/30 dark:bg-green-900/10">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {title || originalLine}
          </p>
          <Badge
            variant="outline"
            className="h-5 border-green-200 bg-green-100 px-1.5 text-[10px] text-green-700 dark:border-green-800 dark:bg-green-900/40 dark:text-green-300"
          >
            Saved
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onRemove}
          disabled={disableRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Ready (Default)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Link className="h-4 w-4" />
      </div>
      
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-foreground">
          {title || originalLine}
        </p>
        <div className="flex items-center gap-2">
          {category && (
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] ${
                CATEGORY_STYLES[category ?? ""] ?? NEUTRAL_CATEGORY_STYLE
              }`}
            >
              {category}
            </span>
          )}
          <Badge
            variant="secondary"
            className="h-5 bg-green-100 px-1.5 text-[10px] text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
          >
            Ready
          </Badge>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onRemove}
        disabled={disableRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

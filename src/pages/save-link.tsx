import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAction, useMutation, useConvex } from "convex/react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileX2, Copy, AlertCircle } from "lucide-react";
import { isValidUrl, normalizeUrl } from "@/utils/urlNormalize";
import {
  fetchPageTitleAction,
  createBookmarkMutation,
  getByNormalizedUrlQuery,
  previewEnrichmentAction,
} from "@/services/bookmarkService";
import type { BookmarkPreview, BookmarkCategory } from "@/types/bookmark";
import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";
import { LinkPreviewCard } from "@/components/ui/custom/LinkPreviewCard";
import { PreviewStatePanel } from "@/components/ui/custom/PreviewStatePanel";
import { BulkImportResult, BulkLinkPreviewCard } from "@/components/ui/custom/BulkLinkPreviewCard";
import { useAppToast } from "@/hooks/useAppToast";

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewState =
  | { status: "idle" }
  | { status: "loading"; rawUrl: string }
  | { status: "valid"; data: BookmarkPreview }
  | { status: "invalid" };

type BulkLineStatus =
  | "processing"
  | "ready"
  | "duplicate"
  | "invalid"
  | "error"
  | "saving"
  | "saved";

type BulkLineReason =
  | "already_saved"
  | "duplicate_in_paste"
  | "invalid_url"
  | "fetch_failed"
  | "save_failed";

interface BulkLineResult {
  originalLine: string;
  normalizedUrl?: string;
  title?: string;
  aiSummary?: string;
  category?: BookmarkCategory;
  status: BulkLineStatus;
  reason?: BulkLineReason;
}

type PreviewEnrichment = {
  aiSummary: string;
  category: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_SUMMARY = "A useful resource saved for later reading.";
const MOCK_CATEGORY: BookmarkCategory = "Uncategorized";

// ─── Sub Component ────────────────────────────────────────────────────────────

type StatusPillTone = "green" | "yellow" | "red" | "orange";

interface StatusPillProps {
  icon: ReactNode;
  label: string;
  count: number;
  tone: StatusPillTone;
}

const toneClasses: Record<StatusPillTone, string> = {
  green:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function StatusPill({ icon, label, count, tone }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {label}: {count}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaveLink() {
  const { isAuthReady } = useAutoAnonymousAuth();
  const { showToast } = useAppToast();

  const convex = useConvex();
  const navigate = useNavigate();
  const fetchTitle = useAction(fetchPageTitleAction);
  const createBookmark = useMutation(createBookmarkMutation);
  const getEnrichment = useAction(previewEnrichmentAction);

  // Single-link state
  const [inputValue, setInputValue] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Bulk state
  const [bulkLineResults, setBulkLineResults] = useState<BulkLineResult[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Derived
  const bulkLines = inputValue.split("\n").filter((l) => l.trim().length > 0);
  const isBulkMode = bulkLines.length > 1;
  const bulkTooMany = bulkLines.length > 30;

  const isPreviewing = preview.status === "loading";
  const isPreviewValid = preview.status === "valid";

  const bulkSummary = bulkLineResults.reduce(
    (acc, item) => {
      if (item.status === "ready") acc.ready += 1;
      else if (item.status === "duplicate") acc.duplicates += 1;
      else if (item.status === "invalid") acc.invalid += 1;
      else if (item.status === "error") acc.errors += 1;
      return acc;
    },
    { ready: 0, duplicates: 0, invalid: 0, errors: 0 }
  );

  const hasBulkReadyRows = bulkLineResults.some((item) => item.status === "ready");
  const bulkReadyCount = bulkLineResults.filter((item) => item.status === "ready").length;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  async function getPreviewEnrichment(params: {
    url: string;
    normalizedUrl: string;
    title: string;
  }): Promise<PreviewEnrichment> {
    try {
      console.log(params);
      const result = await getEnrichment(params);
      console.log(result);
      return result;
    } catch {
      console.log("use mock instead");
      return { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
    }
  }

  async function handlePreview() {
    const raw = inputValue.trim();
    if (!raw) return;

    // Bulk mode: 2+ lines → run bulk preview processing (NO autosave)
    if (isBulkMode) {
      if (bulkTooMany) return;
      await handleBulkProcess();
      return;
    }

    // Single-link mode
    setIsDuplicate(false);
    setBulkLineResults([]);

    console.log("raw", raw);
    console.log("isValidUrl", isValidUrl(raw));

    if (!isValidUrl(raw)) {
      setPreview({ status: "invalid" });
      showToast("Invalid link", "error");
      return;
    }

    setPreview({ status: "loading", rawUrl: raw });

    try {
      // 1) Normalize URL
      const normalized = normalizeUrl(raw);

      // 2) Check duplicate BEFORE fetching title / AI
      const existing = await convex.query(getByNormalizedUrlQuery, {
        normalizedUrl: normalized,
      });

      if (existing) {
        setIsDuplicate(true);
        setReminderAt(existing.reminderAt ?? null);
        setInputValue("");

        setPreview({
          status: "valid",
          data: {
            url: existing.url ?? raw,
            normalizedUrl: existing.normalizedUrl ?? normalized,
            title: existing.title ?? raw,
            aiSummary: "", // duplicate preview should not show summary
            category: (existing.category ?? MOCK_CATEGORY) as BookmarkCategory,
            reminderAt: existing.reminderAt ?? null,
            isValid: true,
          },
        });

        showToast("Already saved — keeping existing reminder.", "info");
        return;
      }

      // 3) Fetch title
      const titleResult = await fetchTitle({ url: raw });

      // 4) Enrich preview (placeholder now, AI later)
      const enrichment = await getPreviewEnrichment({
        url: raw,
        normalizedUrl: normalized,
        title: titleResult.title,
      });

      // 5) Render normal preview
      setInputValue("");
      setReminderAt(null);

      setPreview({
        status: "valid",
        data: {
          url: raw,
          normalizedUrl: normalized,
          title: titleResult.title,
          aiSummary: enrichment.aiSummary,
          category: enrichment.category as BookmarkCategory,
          reminderAt: null,
          isValid: true,
        },
      });
    } catch (e) {
      console.log(e);
      setPreview({ status: "idle" });
      showToast("Could not fetch preview right now. Try again or save later.", "error");
    }
  }

  async function handleBulkProcess() {
    setIsBulkProcessing(true);
    setBulkLineResults([]);
    setPreview({ status: "idle" });
    setIsDuplicate(false);

    const lines = bulkLines;
    const seenNormalized = new Set<string>();
    const results: BulkLineResult[] = [];

    let ready = 0;
    let duplicates = 0;
    let invalid = 0;
    let errors = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // show progressive loading row
      results.push({ originalLine: trimmed, status: "processing" });
      setBulkLineResults([...results]);
      const currentIndex = results.length - 1;

      // 1) Validate
      if (!isValidUrl(trimmed)) {
        invalid++;
        results[currentIndex] = {
          originalLine: trimmed,
          status: "invalid",
          reason: "invalid_url",
        };
        setBulkLineResults([...results]);
        continue;
      }

      // 2) Normalize
      let normalized: string;
      try {
        normalized = normalizeUrl(trimmed);
      } catch {
        errors++;
        results[currentIndex] = {
          originalLine: trimmed,
          status: "error",
          reason: "save_failed",
        };
        setBulkLineResults([...results]);
        continue;
      }

      // 3) Duplicate inside pasted list
      if (seenNormalized.has(normalized)) {
        duplicates++;
        results[currentIndex] = {
          originalLine: trimmed,
          normalizedUrl: normalized,
          status: "duplicate",
          reason: "duplicate_in_paste",
        };
        setBulkLineResults([...results]);
        continue;
      }
      seenNormalized.add(normalized);

      // 4) Duplicate in existing library (preview-time check)
      try {
        const existing = await convex.query(getByNormalizedUrlQuery, {
          normalizedUrl: normalized,
        });

        if (existing) {
          duplicates++;
          results[currentIndex] = {
            originalLine: trimmed,
            normalizedUrl: normalized,
            title: existing.title ?? existing.url ?? trimmed,
            category: (existing.category ?? MOCK_CATEGORY) as BookmarkCategory,
            aiSummary: "",
            status: "duplicate",
            reason: "already_saved",
          };
          setBulkLineResults([...results]);
          continue;
        }
      } catch {
        errors++;
        results[currentIndex] = {
          originalLine: trimmed,
          normalizedUrl: normalized,
          status: "error",
          reason: "save_failed",
        };
        setBulkLineResults([...results]);
        continue;
      }

      // 5) Fetch title
      let title = trimmed;
      try {
        const titleResult = await fetchTitle({ url: trimmed });
        title = titleResult.title;
      } catch {
        // fallback title (still previewable/savable)
        try {
          title = new URL(trimmed).hostname;
        } catch {
          title = trimmed;
        }
      }

      // 6) Enrichment boundary (placeholder now, AI later)
      let enrichment: PreviewEnrichment;
      try {
        enrichment = await getPreviewEnrichment({
          url: trimmed,
          normalizedUrl: normalized,
          title,
        });
      } catch {
        enrichment = { aiSummary: MOCK_SUMMARY, category: MOCK_CATEGORY };
      }

      // 7) Mark READY (not saved yet)
      ready++;
      results[currentIndex] = {
        originalLine: trimmed,
        normalizedUrl: normalized,
        title,
        aiSummary: enrichment.aiSummary,
        category: enrichment.category as BookmarkCategory,
        status: "ready",
      };
      setBulkLineResults([...results]);
    }

    setIsBulkProcessing(false);

    const msg = `Preview ready — ${ready} ready, ${duplicates} duplicate${
      duplicates !== 1 ? "s" : ""
    }, ${invalid} invalid`;
    showToast(msg, ready > 0 ? "success" : "info");
  }

  function buildBulkResultFromRows(rows: BulkLineResult[]): BulkImportResult | null {
    if (rows.length === 0) return null;

    let ready = 0;
    let duplicates = 0;
    let invalid = 0;
    let errors = 0;

    for (const row of rows) {
      if (row.status === "ready") ready++;
      else if (row.status === "duplicate") duplicates++;
      else if (row.status === "invalid") invalid++;
      else if (row.status === "error") errors++;
    }

    return { ready, duplicates, invalid, errors };
  }

  function handleRemoveBulkItem(indexToRemove: number) {
    const next = bulkLineResults.filter((_, index) => index !== indexToRemove);
    setBulkLineResults(next);

    if (next.length === 0) {
      setPreview({ status: "idle" });
      setIsDuplicate(false);
    }
  }

  async function handleSave() {
    // Bulk preview exists → save all "ready" rows
    if (bulkLineResults.length > 0) {
      await handleBulkSave();
      return;
    }

    // Single-link save
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
        setIsDuplicate(true);
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

  async function handleBulkSave() {
    const readyIndexes = bulkLineResults
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "ready");

    if (readyIndexes.length === 0) {
      showToast("No valid links to save.", "info");
      return;
    }

    setIsSaving(true);

    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const next = [...bulkLineResults];

    for (const { item, idx } of readyIndexes) {
      next[idx] = { ...item, status: "saving" };
      setBulkLineResults([...next]);

      try {
        const result = await createBookmark({
          url: item.originalLine,
          normalizedUrl: item.normalizedUrl!,
          title: item.title ?? item.originalLine,
          aiSummary: item.aiSummary ?? MOCK_SUMMARY,
          category: (item.category ?? MOCK_CATEGORY) as BookmarkCategory,
          reminderAt: undefined,
        });

        if (result.alreadyExists) {
          duplicateCount++;
          next[idx] = {
            ...item,
            status: "duplicate",
            reason: "already_saved",
          };
        } else {
          savedCount++;
          next[idx] = {
            ...item,
            status: "saved",
          };
        }
      } catch {
        errorCount++;
        next[idx] = {
          ...item,
          status: "error",
          reason: "save_failed",
        };
      }

      setBulkLineResults([...next]);
    }

    setIsSaving(false);
    showToast(
      `Saved ${savedCount} link${savedCount !== 1 ? "s" : ""}${
        duplicateCount ? `, ${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""}` : ""
      }${errorCount ? `, ${errorCount} error${errorCount !== 1 ? "s" : ""}` : ""}`,
      savedCount > 0 ? "success" : "info"
    );

    // If at least one link was saved, reset page state and go to library
    if (savedCount > 0) {
      setInputValue("");
      setBulkLineResults([]);
      setPreview({ status: "idle" });
      setIsDuplicate(false);
      setReminderAt(null);

      navigate("/library");
      return;
    }
  }

  function handleCancel() {
    navigate(-1);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const isProcessing = isPreviewing || isBulkProcessing || isSaving;
  
  if (!isAuthReady) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <span className="inline-block h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Add Link
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste one or more article links to save them to your library.
          </p>
        </div>

        {/* Input area */}
        <div className="space-y-2">
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Paste a link here... For multiple links, paste one URL per line."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Clear previous bulk preview results when input changes
              if (bulkLineResults.length > 0) {
                setBulkLineResults([]);
                setPreview({ status: "idle" });
                setIsDuplicate(false);
              }
            }}
            disabled={isProcessing}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                if (!isProcessing && inputValue.trim() && !bulkTooMany) {
                  void handlePreview();
                }
              }
            }}
          />

          {/* Helper row */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isBulkMode
                ? `${bulkLines.length} links detected · one URL per line`
                : "We'll fetch the title and help you remember why you saved it."}
            </p>

            <div className="flex items-center gap-2">
              {/* Preview — handles both single and bulk */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isProcessing || !inputValue.trim() || bulkTooMany}
              >
                {isPreviewing || isBulkProcessing ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {isBulkMode ? "Previewing..." : "Fetching..."}
                  </span>
                ) : isBulkMode ? (
                  "Preview All"
                ) : (
                  "Preview"
                )}
              </Button>
            </div>
          </div>

          {/* Hard block: too many lines */}
          {bulkTooMany && (
            <p className="text-xs text-destructive font-medium">
              Max 30 links at a time
            </p>
          )}

          {/* Bulk summary pills (derived from current row statuses) */}
          {bulkLineResults.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusPill
                icon={<CheckCircle2 size={11} />}
                label="Ready"
                count={bulkSummary.ready}
                tone="green"
              />
              <StatusPill
                icon={<Copy size={11} />}
                label="Duplicates"
                count={bulkSummary.duplicates}
                tone="yellow"
              />
              <StatusPill
                icon={<FileX2 size={11} />}
                label="Invalid"
                count={bulkSummary.invalid}
                tone="red"
              />
              {bulkSummary.errors > 0 && (
                <StatusPill
                  icon={<AlertCircle size={11} />}
                  label="Errors"
                  count={bulkSummary.errors}
                  tone="orange"
                />
              )}
            </div>
          )}
        </div>

        {/* ── Preview area ───────────────────────────────────────────────────── */}
        {preview.status === "idle" && bulkLineResults.length === 0 && (
          <PreviewStatePanel mode="empty" />
        )}

        {!isBulkMode && preview.status === "invalid" && (
          <PreviewStatePanel mode="invalid" />
        )}

        {!isBulkMode && preview.status === "loading" && (
          <LinkPreviewCard mode="loading" rawUrl={preview.rawUrl} />
        )}

        {!isBulkMode && preview.status === "valid" && (
          <LinkPreviewCard
            mode="ready"
            title={preview.data.title}
            aiSummary={preview.data.aiSummary}
            category={preview.data.category}
            isDuplicate={isDuplicate}
            isSaving={isSaving}
            reminderAt={reminderAt}
            onReminderChange={setReminderAt}
            onClear={() => {
              setPreview({ status: "idle" });
              setReminderAt(null);
              setIsDuplicate(false);
            }}
            showClearButton
            showReminder
            showSummary={!isDuplicate}
          />
        )}

        {/* ── Bulk preview rows (compact cards) ─────────────────────────────── */}
        {bulkLineResults.length > 0 && (
          <div className="space-y-2">
            {bulkLineResults.map((item, idx) => (
              <BulkLinkPreviewCard
                key={`${item.normalizedUrl ?? item.originalLine}-${idx}`}
                item={item}
                onRemove={() => handleRemoveBulkItem(idx)}
                disableRemove={isSaving || isBulkProcessing || item.status === "saving"}
              />
            ))}
          </div>
        )}

        {/* ── Footer actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              isBulkProcessing ||
              (bulkLineResults.length > 0
                ? !hasBulkReadyRows
                : !isPreviewValid || isDuplicate)
            }
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Saving...
              </span>
            ) : bulkLineResults.length > 0 ? (
              `Save ${bulkReadyCount} Ready Link${bulkReadyCount === 1 ? "" : "s"}`
            ) : (
              "Save to Library"
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
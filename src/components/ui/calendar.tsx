import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { isValidUrl, normalizeUrl } from "@/utils/urlNormalize";
import {
  fetchPageTitleAction,
  createBookmarkMutation,
} from "@/services/bookmarkService";
import type { BookmarkPreview } from "@/types/bookmark";
import ReminderPopover from "./ReminderPopover";
// import { useAutoAnonymousAuth } from "@/hooks/useAutoAnonymousAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; data: BookmarkPreview }
  | { status: "invalid" };

const MOCK_SUMMARY = "A useful resource saved for later reading.";
const TOAST_ID = "save-link";


// ─── Component ────────────────────────────────────────────────────────────────

export default function SaveLink() {
  // useAutoAnonymousAuth();

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
          <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-3">
            {/* Title — prominent, no label above it */}
            <p className="text-sm font-semibold text-foreground leading-snug">
              {preview.data.title}
            </p>

            {/* Summary — small muted text, no heavy label */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {preview.data.aiSummary}
            </p>

            {/* Category chip + Reminder trigger — same row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {preview.data.category}
              </span>
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

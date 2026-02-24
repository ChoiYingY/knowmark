import { FileX2, Link } from "lucide-react";

interface PreviewStatePanelProps {
  mode: "empty" | "invalid";
}

export function PreviewStatePanel({ mode }: PreviewStatePanelProps) {
  if (mode === "empty") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/5 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20">
          <Link className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Paste a link above and click Preview
          </p>
        </div>
      </div>
    );
  }

  // mode === "invalid"
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
      <FileX2 className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          This doesn't look like a valid link. Please check the URL and try again.
        </p>
      </div>
    </div>
  );
}

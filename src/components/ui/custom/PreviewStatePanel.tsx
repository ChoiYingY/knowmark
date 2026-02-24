type PreviewStatePanelProps =
  | { mode: "empty" }
  | { mode: "invalid" };

export function PreviewStatePanel(props: PreviewStatePanelProps) {
  if (props.mode === "empty") {
    return (
      <div className="min-h-[120px] border border-dashed border-border rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Preview will appear here after clicking Preview
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-background px-4 py-4">
      <p className="text-sm text-destructive font-medium">
        This doesn't look like a valid link
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Make sure the URL starts with http:// or https:// and try again.
      </p>
    </div>
  );
}
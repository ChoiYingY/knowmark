import { Clock } from "lucide-react";

type Effort = "short" | "medium" | "long";

export interface EffortChipProps {
  effort?: Effort | string | null; // allows older callers that still pass string
  className?: string;
}

export function EffortChip({ effort, className }: EffortChipProps) {
  const normalizedEffort = (effort ?? "").toString().trim().toLowerCase();

  if (normalizedEffort !== "short" && normalizedEffort !== "medium" && normalizedEffort !== "long") {
    return null;
  }

  const label =
    normalizedEffort === "short"
      ? "Light read (~5m)"
      : normalizedEffort === "medium"
      ? "Steady read (~10m)"
      : "Deep read (~20m+)";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Clock size={10} />
      {label}
    </span>
  );
}
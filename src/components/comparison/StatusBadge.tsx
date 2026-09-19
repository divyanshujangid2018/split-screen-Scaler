import { Badge } from "@/components/ui/badge";
import type { ComparisonStatus } from "@/types";

const LABELS: Record<ComparisonStatus, string> = {
  same: "✓ Same",
  modified: "≈ Modified",
  missing: "✕ Missing",
  new: "+ New",
  renamed: "↷ Renamed",
  uncertain: "⚠ Uncertain",
  unsupported: "Unsupported",
  pending: "Comparing…",
};

const VARIANTS: Record<ComparisonStatus, "same" | "modified" | "missing" | "new" | "renamed" | "uncertain" | "unsupported" | "default"> = {
  same: "same",
  modified: "modified",
  missing: "missing",
  new: "new",
  renamed: "renamed",
  uncertain: "uncertain",
  unsupported: "unsupported",
  pending: "default",
};

export function StatusBadge({ status }: { status: ComparisonStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}

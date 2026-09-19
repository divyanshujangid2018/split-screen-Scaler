import { useMemo } from "react";
import type { ComparisonRow, FileHashState, UserDataset } from "@/types";
import { buildRowsFromMatches, computeMatches } from "@/lib/comparison";

export function useComparisonRows(
  reference: UserDataset | undefined,
  comparisonUsers: UserDataset[],
  fileHashes: Record<string, FileHashState>,
): ComparisonRow[] {
  // Expensive: only recomputes when a user's file list actually changes (indexing).
  const matches = useMemo(() => {
    if (!reference || reference.status !== "ready") return new Map();
    return computeMatches(reference, comparisonUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, comparisonUsers]);

  // Cheap: recomputes on every hash resolution, but only does lookups + comparisons.
  return useMemo(() => {
    if (!reference || reference.status !== "ready") return [];
    const getHash = (fileId: string) => fileHashes[fileId];
    return buildRowsFromMatches(reference, comparisonUsers, matches, getHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, fileHashes, reference, comparisonUsers]);
}

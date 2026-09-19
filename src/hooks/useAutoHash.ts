import { useEffect } from "react";
import type { ComparisonRow, FileItem } from "@/types";
import { enqueueHash } from "@/lib/hashQueue";
import { useAppStore } from "@/store/appStore";

/**
 * Demand-driven hashing: only hashes a file once we actually need its content compared,
 * i.e. it was matched to a same-size counterpart and we don't have a verdict yet.
 * Reference files and comparison files are both hashed lazily this way - never eagerly
 * for the whole dataset up front.
 */
export function useAutoHash(rows: ComparisonRow[]) {
  const fileHashes = useAppStore((s) => s.fileHashes);
  const markHashing = useAppStore((s) => s.markHashing);
  const updateFileHash = useAppStore((s) => s.updateFileHash);

  useEffect(() => {
    const seen = new Set<string>();

    function tryHash(file: FileItem | null) {
      if (!file) return;
      if (seen.has(file.id)) return;
      seen.add(file.id);
      const state = fileHashes[file.id];
      if (state?.status === "done" || state?.status === "hashing" || state?.status === "error") return;
      markHashing(file.id);
      enqueueHash(file, (result) => updateFileHash(file.id, result));
    }

    for (const row of rows) {
      let anyPending = false;
      for (const cell of Object.values(row.cells)) {
        if (cell.status === "pending") {
          anyPending = true;
          tryHash(cell.file);
        }
      }
      if (anyPending) tryHash(row.referenceFile);
    }
  }, [rows, fileHashes, markHashing, updateFileHash]);
}

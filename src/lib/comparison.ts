import type {
  ComparisonCell,
  ComparisonRow,
  FileHashState,
  FileItem,
  MatchConfidence,
  UserDataset,
} from "@/types";
import { matchAgainstReference, type MatchResult } from "./fileMatching";
import { normalizeFileName } from "./normalization";

export type HashLookup = (fileId: string) => FileHashState | undefined;

export interface UserMatchResult {
  matches: Map<string, MatchResult | null>;
  unmatched: FileItem[];
}

/**
 * The expensive step: aligns every comparison user's files against the reference set.
 * Pure function of the two file lists, so callers should memoize this on
 * (reference.files, user.files) identity and NOT recompute it when a hash resolves.
 */
export function computeMatches(reference: UserDataset, comparisonUsers: UserDataset[]): Map<string, UserMatchResult> {
  const result = new Map<string, UserMatchResult>();
  for (const user of comparisonUsers) {
    result.set(user.id, matchAgainstReference(reference.files, user.files));
  }
  return result;
}

function cellForMatch(ref: FileItem, match: MatchResult | null, getHash: HashLookup): ComparisonCell {
  if (!match) return { file: null, status: "missing", confidence: "none" };

  const { file, confidence } = match;

  if (confidence === "possible") {
    return { file, status: "uncertain", confidence };
  }

  if (file.size !== ref.size) {
    return { file, status: "modified", confidence };
  }

  const refHash = getHash(ref.id);
  const fileHash = getHash(file.id);

  if (refHash?.status === "error" || fileHash?.status === "error") {
    return { file, status: "unsupported", confidence };
  }
  if (refHash?.status !== "done" || fileHash?.status !== "done") {
    return { file, status: "pending", confidence };
  }

  const sameContent = refHash.hash === fileHash.hash;
  const nameDiffers = normalizeFileName(ref.name) !== normalizeFileName(file.name);

  if (sameContent) {
    return { file, status: nameDiffers ? "renamed" : "same", confidence };
  }
  return { file, status: "modified", confidence };
}

function newRowCell(file: FileItem, confidence: MatchConfidence = "exact"): ComparisonCell {
  return { file, status: "new", confidence };
}

function absentCell(): ComparisonCell {
  return { file: null, status: "missing", confidence: "none" };
}

function buildSearchKey(row: Pick<ComparisonRow, "referenceFile" | "cells">): string {
  const parts: string[] = [];
  if (row.referenceFile) {
    parts.push(row.referenceFile.name, row.referenceFile.relativePath, row.referenceFile.extension);
  }
  for (const cell of Object.values(row.cells)) {
    if (cell.file) parts.push(cell.file.name, cell.file.relativePath);
    parts.push(cell.status);
  }
  return parts.join(" ").toLowerCase();
}

/**
 * The cheap step: turns cached match results + current hash state into rows. Safe to
 * recompute on every hash resolution - it does no string matching, just lookups.
 */
export function buildRowsFromMatches(
  reference: UserDataset,
  comparisonUsers: UserDataset[],
  matchesByUser: Map<string, UserMatchResult>,
  getHash: HashLookup,
): ComparisonRow[] {
  const rows: ComparisonRow[] = reference.files.map((ref) => ({
    id: `ref:${ref.id}`,
    referenceFile: ref,
    cells: {},
    isExtraRow: false,
    searchKey: "",
  }));
  const rowByRefId = new Map(reference.files.map((ref, i) => [ref.id, rows[i]]));

  const newFileGroups = new Map<string, { name: string; entries: Map<string, FileItem> }>();

  for (const user of comparisonUsers) {
    const userMatches = matchesByUser.get(user.id);
    if (!userMatches) continue;
    const { matches, unmatched } = userMatches;

    for (const ref of reference.files) {
      const row = rowByRefId.get(ref.id)!;
      row.cells[user.id] = cellForMatch(ref, matches.get(ref.id) ?? null, getHash);
    }

    for (const file of unmatched) {
      const key = normalizeFileName(file.name);
      let group = newFileGroups.get(key);
      if (!group) {
        group = { name: file.name, entries: new Map() };
        newFileGroups.set(key, group);
      }
      group.entries.set(user.id, file);
    }
  }

  const comparisonUserIds = comparisonUsers.map((u) => u.id);
  const extraRows: ComparisonRow[] = Array.from(newFileGroups.entries())
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, group]) => {
      const cells: Record<string, ComparisonCell> = {};
      for (const uid of comparisonUserIds) {
        const file = group.entries.get(uid);
        cells[uid] = file ? newRowCell(file) : absentCell();
      }
      return {
        id: `new:${key}`,
        referenceFile: null,
        cells,
        isExtraRow: true,
        searchKey: "",
      };
    });

  const allRows = [...rows, ...extraRows];
  for (const row of allRows) row.searchKey = buildSearchKey(row);
  return allRows;
}

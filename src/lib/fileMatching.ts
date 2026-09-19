import type { FileItem, MatchConfidence } from "@/types";
import { baseNameWithoutExtension, normalizeFileName, normalizeRelativePath, similarity } from "./normalization";

export interface MatchResult {
  file: FileItem;
  confidence: MatchConfidence;
}

const FUZZY_THRESHOLD = 0.72;

/**
 * Matches one comparison user's files against the reference set.
 * Returns a match (or null) per reference file, plus the comparison files that were
 * never claimed by any reference file (candidates for "new" rows).
 */
export function matchAgainstReference(
  referenceFiles: FileItem[],
  comparisonFiles: FileItem[],
): { matches: Map<string, MatchResult | null>; unmatched: FileItem[] } {
  const matches = new Map<string, MatchResult | null>();
  const claimed = new Set<string>();

  const byPath = new Map<string, FileItem[]>();
  const byExactName = new Map<string, FileItem[]>();
  const byNormName = new Map<string, FileItem[]>();
  const byBaseName = new Map<string, FileItem[]>();

  for (const f of comparisonFiles) {
    addTo(byPath, normalizeRelativePath(f.relativePath), f);
    addTo(byExactName, f.name, f);
    addTo(byNormName, normalizeFileName(f.name), f);
    addTo(byBaseName, baseNameWithoutExtension(f.name), f);
  }

  const takeFirstUnclaimed = (list: FileItem[] | undefined): FileItem | undefined =>
    list?.find((f) => !claimed.has(f.id));

  // Pass 1: exact relative path, then exact filename - both "exact" confidence.
  for (const ref of referenceFiles) {
    const pathHit = takeFirstUnclaimed(byPath.get(normalizeRelativePath(ref.relativePath)));
    if (pathHit) {
      matches.set(ref.id, { file: pathHit, confidence: "exact" });
      claimed.add(pathHit.id);
      continue;
    }
    const nameHit = takeFirstUnclaimed(byExactName.get(ref.name));
    if (nameHit) {
      matches.set(ref.id, { file: nameHit, confidence: "exact" });
      claimed.add(nameHit.id);
    }
  }

  // Pass 2: normalized filename -> "likely"
  for (const ref of referenceFiles) {
    if (matches.has(ref.id)) continue;
    const hit = takeFirstUnclaimed(byNormName.get(normalizeFileName(ref.name)));
    if (hit) {
      matches.set(ref.id, { file: hit, confidence: "likely" });
      claimed.add(hit.id);
    }
  }

  // Pass 3: filename without extension -> "likely"
  for (const ref of referenceFiles) {
    if (matches.has(ref.id)) continue;
    const hit = takeFirstUnclaimed(byBaseName.get(baseNameWithoutExtension(ref.name)));
    if (hit) {
      matches.set(ref.id, { file: hit, confidence: "likely" });
      claimed.add(hit.id);
    }
  }

  // Pass 4: same extension + fuzzy name similarity -> "possible"
  for (const ref of referenceFiles) {
    if (matches.has(ref.id)) continue;
    let best: { file: FileItem; score: number } | null = null;
    const refBase = baseNameWithoutExtension(ref.name);
    for (const cand of comparisonFiles) {
      if (claimed.has(cand.id)) continue;
      if (cand.extension !== ref.extension) continue;
      const score = similarity(refBase, baseNameWithoutExtension(cand.name));
      if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
        best = { file: cand, score };
      }
    }
    if (best) {
      matches.set(ref.id, { file: best.file, confidence: "possible" });
      claimed.add(best.file.id);
    }
  }

  for (const ref of referenceFiles) {
    if (!matches.has(ref.id)) matches.set(ref.id, null);
  }

  const unmatched = comparisonFiles.filter((f) => !claimed.has(f.id));
  return { matches, unmatched };
}

function addTo<K>(map: Map<K, FileItem[]>, key: K, file: FileItem) {
  const list = map.get(key);
  if (list) list.push(file);
  else map.set(key, [file]);
}

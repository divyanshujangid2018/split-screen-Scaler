/** Lowercase, unify separators, and strip common "duplicate copy" / version noise. */
export function normalizeFileName(name: string): string {
  let n = name.toLowerCase().trim();
  n = n.replace(/\\/g, "/");
  // Everything below strips noise immediately before the extension (not just at the very
  // end of the string), so "report (1).pdf" and "report.pdf" still normalize the same.
  const extMatch = /(?=\.[a-z0-9]+$)/i;
  // strip "(1)", "(2)", " copy", " copy 2" style duplicate markers
  n = n.replace(new RegExp(`\\s*\\(\\d+\\)${extMatch.source}`, "i"), "");
  n = n.replace(new RegExp(`\\s*-\\s*copy(\\s*\\d*)?${extMatch.source}`, "i"), "");
  n = n.replace(new RegExp(`\\s+copy(\\s*\\d*)?${extMatch.source}`, "i"), "");
  // strip version-ish suffixes right before the extension: file_v2.txt, file-v1.2.txt, file.v3.txt
  n = n.replace(new RegExp(`[_\\-.]v\\d+(\\.\\d+)*${extMatch.source}`, "i"), "");
  // unify separators between words
  n = n.replace(/[\s_-]+/g, "_");
  return n;
}

export function normalizeRelativePath(path: string): string {
  return path
    .toLowerCase()
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

export function stripExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

export function baseNameWithoutExtension(name: string): string {
  return normalizeFileName(stripExtension(name));
}

/** Simple, dependency-free Levenshtein-based similarity in [0, 1]. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = new Array(rows);
  for (let i = 0; i < rows; i++) dist[i] = new Array(cols).fill(0);
  for (let i = 0; i < rows; i++) dist[i][0] = i;
  for (let j = 0; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist[rows - 1][cols - 1] / maxLen;
}

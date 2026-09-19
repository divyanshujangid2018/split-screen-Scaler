export type SourceType = "zip" | "folder" | "files";

export type PreviewKind = "text" | "image" | "pdf" | "unsupported";

/** Where the bytes for a file actually live. */
export interface FileLocation {
  kind: "disk" | "zip";
  /** Absolute path to the file on disk, or to the containing zip archive. */
  path: string;
  /** Only set when kind === "zip": the entry name inside the archive. */
  entryName?: string;
}

export interface FileItem {
  id: string;
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  modifiedAt?: number;
  previewKind: PreviewKind;
  location: FileLocation;
}

/**
 * Content hashes live outside FileItem/UserDataset on purpose: a hash resolving must never
 * invalidate the (expensive) file-matching pass, only the (cheap) same/modified verdict.
 */
export interface FileHashState {
  status: "idle" | "hashing" | "done" | "error";
  hash?: string;
}

export type UserStatus = "idle" | "indexing" | "ready" | "error";

export interface UserDataset {
  id: string;
  name: string;
  color: string;
  sourceType: SourceType;
  sourceName: string;
  sourcePath?: string;
  files: FileItem[];
  isReference: boolean;
  status: UserStatus;
  progress: number;
  error?: string;
  order: number;
}

export type MatchConfidence = "exact" | "likely" | "possible" | "none";

export type ComparisonStatus =
  | "same"
  | "modified"
  | "missing"
  | "new"
  | "renamed"
  | "uncertain"
  | "unsupported"
  | "pending";

export interface ComparisonCell {
  file: FileItem | null;
  status: ComparisonStatus;
  confidence: MatchConfidence;
}

export interface ComparisonRow {
  id: string;
  referenceFile: FileItem | null;
  cells: Record<string, ComparisonCell>;
  /** true when this row was contributed by a comparison user with no reference counterpart. */
  isExtraRow: boolean;
  searchKey: string;
}

export type StatusFilter = "all" | ComparisonStatus;

export interface IndexingProgress {
  userId: string;
  processed: number;
  total: number;
}

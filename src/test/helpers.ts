import type { FileHashState, FileItem, UserDataset } from "@/types";
import { classifyPreview } from "@/lib/preview";

let counter = 0;

export function makeFile(overrides: Partial<FileItem> & { name: string }): FileItem {
  counter++;
  const extension = overrides.extension ?? (overrides.name.split(".").pop() ?? "");
  return {
    id: overrides.id ?? `file-${counter}`,
    name: overrides.name,
    relativePath: overrides.relativePath ?? overrides.name,
    extension,
    size: overrides.size ?? 100,
    modifiedAt: overrides.modifiedAt,
    previewKind: overrides.previewKind ?? classifyPreview(extension),
    location: overrides.location ?? { kind: "disk", path: `/tmp/${overrides.name}` },
  };
}

export function makeUser(overrides: Partial<UserDataset> & { id: string }): UserDataset {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    color: overrides.color ?? "#334155",
    sourceType: overrides.sourceType ?? "folder",
    sourceName: overrides.sourceName ?? overrides.id,
    sourcePath: overrides.sourcePath,
    files: overrides.files ?? [],
    isReference: overrides.isReference ?? false,
    status: overrides.status ?? "ready",
    progress: overrides.progress ?? 100,
    error: overrides.error,
    order: overrides.order ?? 0,
  };
}

export function hashMap(entries: [FileItem, string][]): Record<string, FileHashState> {
  const map: Record<string, FileHashState> = {};
  for (const [file, hash] of entries) map[file.id] = { status: "done", hash };
  return map;
}

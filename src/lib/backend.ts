import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import type { FileItem, FileLocation } from "@/types";
import { classifyPreview } from "./preview";

interface RawFileEntry {
  relative_path: string;
  name: string;
  extension: string;
  size: number;
  modified_at?: number | null;
  abs_path: string;
}

interface IndexResult {
  files: RawFileEntry[];
  errors: string[];
}

function toFileItem(raw: RawFileEntry, location: FileLocation): FileItem {
  return {
    id: `${location.kind}:${location.path}:${location.entryName ?? raw.abs_path}`,
    name: raw.name,
    relativePath: raw.relative_path,
    extension: raw.extension,
    size: raw.size,
    modifiedAt: raw.modified_at ?? undefined,
    previewKind: classifyPreview(raw.extension),
    location,
  };
}

export async function pickZipFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  return typeof result === "string" ? result : null;
}

export async function pickFolder(): Promise<string | null> {
  const result = await open({ multiple: false, directory: true });
  return typeof result === "string" ? result : null;
}

export async function pickFiles(): Promise<string[] | null> {
  const result = await open({ multiple: true, directory: false });
  if (!result) return null;
  return Array.isArray(result) ? result : [result];
}

export async function indexFolder(rootPath: string): Promise<{ files: FileItem[]; errors: string[] }> {
  const res = await invoke<IndexResult>("index_folder", { root: rootPath });
  const files = res.files.map((raw) => toFileItem(raw, { kind: "disk", path: raw.abs_path }));
  return { files, errors: res.errors };
}

export async function indexFiles(paths: string[]): Promise<{ files: FileItem[]; errors: string[] }> {
  const res = await invoke<IndexResult>("index_files", { paths });
  const files = res.files.map((raw) => toFileItem(raw, { kind: "disk", path: raw.abs_path }));
  return { files, errors: res.errors };
}

export async function indexZip(zipPath: string): Promise<{ files: FileItem[]; errors: string[] }> {
  const res = await invoke<IndexResult>("index_zip", { zipPath });
  const files = res.files.map((raw) =>
    toFileItem(raw, { kind: "zip", path: zipPath, entryName: raw.relative_path }),
  );
  return { files, errors: res.errors };
}

export async function hashFileLocation(location: FileLocation): Promise<string> {
  if (location.kind === "disk") {
    return invoke<string>("hash_file", { path: location.path });
  }
  return invoke<string>("hash_zip_entry", { zipPath: location.path, entryName: location.entryName });
}

const DEFAULT_TEXT_LIMIT = 2_000_000;

export async function readTextPreview(location: FileLocation, maxBytes = DEFAULT_TEXT_LIMIT): Promise<string> {
  if (location.kind === "disk") {
    return invoke<string>("read_file_text", { path: location.path, maxBytes });
  }
  return invoke<string>("read_zip_entry_text", {
    zipPath: location.path,
    entryName: location.entryName,
    maxBytes,
  });
}

export async function readBinaryPreviewBase64(location: FileLocation, maxBytes?: number): Promise<string> {
  if (location.kind === "disk") {
    return invoke<string>("read_file_bytes", { path: location.path, maxBytes });
  }
  return invoke<string>("read_zip_entry_bytes", {
    zipPath: location.path,
    entryName: location.entryName,
    maxBytes,
  });
}

export async function openInDefaultApp(location: FileLocation): Promise<void> {
  if (location.kind === "disk") {
    await openPath(location.path);
  }
  // Zip-internal entries can't be opened directly in an external app from here;
  // the in-app preview covers them instead.
}

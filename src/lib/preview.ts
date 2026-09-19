import type { PreviewKind } from "@/types";

export const TEXT_EXTENSIONS = new Set([
  "txt", "json", "xml", "html", "htm", "css", "scss", "less",
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "java", "c", "h", "cpp", "cc", "hpp",
  "md", "markdown", "csv", "tsv", "yml", "yaml",
  "ini", "cfg", "conf", "toml", "env", "gradle", "properties",
  "sh", "bash", "zsh", "bat", "ps1",
  "sql", "graphql", "rs", "go", "rb", "php", "kt", "swift",
  "log", "gitignore", "editorconfig",
]);

export const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico",
]);

export const PDF_EXTENSIONS = new Set(["pdf"]);

export function classifyPreview(extension: string): PreviewKind {
  const ext = extension.toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  return "unsupported";
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  pdf: "application/pdf",
};

export function mimeForExtension(extension: string): string {
  return MIME_BY_EXTENSION[extension.toLowerCase()] ?? "application/octet-stream";
}

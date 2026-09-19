import { useEffect, useState } from "react";
import { FileQuestion, FileText, Image as ImageIcon, FileType } from "lucide-react";
import type { FileItem } from "@/types";
import { readBinaryPreviewBase64, readTextPreview } from "@/lib/backend";
import { mimeForExtension } from "@/lib/preview";
import { imagePreviewCache, textPreviewCache } from "@/lib/previewCache";
import { formatBytes } from "@/lib/utils";

const TEXT_SNIPPET_BYTES = 600;
const IMAGE_THUMB_MAX_BYTES = 4_000_000;

export function FileThumb({ file }: { file: FileItem | null }) {
  if (!file) {
    return <div className="flex h-full items-center justify-center text-xs text-slate-400">—</div>;
  }
  switch (file.previewKind) {
    case "text":
      return <TextThumb file={file} />;
    case "image":
      return <ImageThumb file={file} />;
    case "pdf":
      return <PdfThumb file={file} />;
    default:
      return <UnsupportedThumb file={file} />;
  }
}

function TextThumb({ file }: { file: FileItem }) {
  const [snippet, setSnippet] = useState<string | null>(textPreviewCache.get(file.id) ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (snippet !== null) return;
    let cancelled = false;
    readTextPreview(file.location, TEXT_SNIPPET_BYTES)
      .then((text) => {
        if (cancelled) return;
        textPreviewCache.set(file.id, text);
        setSnippet(text);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return (
    <div className="flex h-full flex-col gap-1 overflow-hidden">
      <div className="flex items-center gap-1.5 text-slate-400">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-[11px]">{formatBytes(file.size)}</span>
      </div>
      <pre className="min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-slate-500 dark:text-slate-400">
        {error ? "Preview unavailable" : (snippet ?? "…")}
      </pre>
    </div>
  );
}

function ImageThumb({ file }: { file: FileItem }) {
  const [src, setSrc] = useState<string | null>(imagePreviewCache.get(file.id) ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src !== null) return;
    if (file.size > IMAGE_THUMB_MAX_BYTES) return;
    let cancelled = false;
    readBinaryPreviewBase64(file.location)
      .then((b64) => {
        if (cancelled) return;
        const url = `data:${mimeForExtension(file.extension)};base64,${b64}`;
        imagePreviewCache.set(file.id, url);
        setSrc(url);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  if (file.size > IMAGE_THUMB_MAX_BYTES) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
        <ImageIcon className="h-5 w-5" />
        <span className="text-[10px]">Large image · {formatBytes(file.size)}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
        <ImageIcon className="h-5 w-5" />
        <span className="text-[10px]">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center overflow-hidden">
      {src ? (
        <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
      ) : (
        <ImageIcon className="h-5 w-5 animate-pulse text-slate-300" />
      )}
    </div>
  );
}

function PdfThumb({ file }: { file: FileItem }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
      <FileType className="h-6 w-6" />
      <span className="text-[10px]">PDF · {formatBytes(file.size)}</span>
    </div>
  );
}

function UnsupportedThumb({ file }: { file: FileItem }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
      <FileQuestion className="h-6 w-6" />
      <span className="text-[10px]">No preview · {formatBytes(file.size)}</span>
    </div>
  );
}

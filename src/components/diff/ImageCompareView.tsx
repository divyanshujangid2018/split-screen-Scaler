import { useEffect, useState } from "react";
import type { FileItem } from "@/types";
import { readBinaryPreviewBase64 } from "@/lib/backend";
import { mimeForExtension } from "@/lib/preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes } from "@/lib/utils";

const MAX_MODAL_IMAGE_BYTES = 20_000_000;

function useImageDataUrl(file: FileItem | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSrc(null);
    setTooLarge(false);
    setError(false);
    if (!file) return;
    if (file.size > MAX_MODAL_IMAGE_BYTES) {
      setTooLarge(true);
      return;
    }
    let cancelled = false;
    readBinaryPreviewBase64(file.location)
      .then((b64) => !cancelled && setSrc(`data:${mimeForExtension(file.extension)};base64,${b64}`))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [file]);

  return { src, tooLarge, error };
}

export function ImageCompareView({ leftFile, rightFile }: { leftFile: FileItem | null; rightFile: FileItem | null }) {
  const left = useImageDataUrl(leftFile);
  const right = useImageDataUrl(rightFile);

  if (!leftFile && !rightFile) return null;

  if (!rightFile || !leftFile) {
    const only = leftFile ? left : right;
    const file = leftFile ?? rightFile;
    return <SinglePane src={only.src} tooLarge={only.tooLarge} error={only.error} file={file} />;
  }

  return (
    <Tabs defaultValue="side-by-side" className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <TabsList>
          <TabsTrigger value="side-by-side">Side by side</TabsTrigger>
          <TabsTrigger value="overlay">Overlay</TabsTrigger>
          <TabsTrigger value="difference">Difference</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="side-by-side" className="m-0 grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
        <SinglePane src={left.src} tooLarge={left.tooLarge} error={left.error} file={leftFile} />
        <SinglePane src={right.src} tooLarge={right.tooLarge} error={right.error} file={rightFile} />
      </TabsContent>
      <TabsContent value="overlay" className="relative m-0 min-h-0 flex-1 overflow-auto bg-slate-100 dark:bg-slate-900">
        {left.src && right.src ? (
          <div className="relative flex h-full items-center justify-center">
            <img src={left.src} alt="reference" className="max-h-full max-w-full object-contain" />
            <img src={right.src} alt="comparison" className="absolute max-h-full max-w-full object-contain opacity-50" />
          </div>
        ) : (
          <LoadingOrError left={left} right={right} />
        )}
      </TabsContent>
      <TabsContent value="difference" className="relative m-0 min-h-0 flex-1 overflow-auto bg-black">
        {left.src && right.src ? (
          <div className="relative flex h-full items-center justify-center">
            <img src={left.src} alt="reference" className="max-h-full max-w-full object-contain" />
            <img
              src={right.src}
              alt="comparison"
              className="absolute max-h-full max-w-full object-contain"
              style={{ mixBlendMode: "difference" }}
            />
          </div>
        ) : (
          <LoadingOrError left={left} right={right} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function LoadingOrError({ left, right }: { left: ReturnType<typeof useImageDataUrl>; right: ReturnType<typeof useImageDataUrl> }) {
  if (left.error || right.error) return <div className="p-4 text-sm text-red-600">Could not load one of the images.</div>;
  if (left.tooLarge || right.tooLarge) return <div className="p-4 text-sm text-slate-400">One image is too large to preview inline.</div>;
  return <div className="p-4 text-sm text-slate-400">Loading images…</div>;
}

function SinglePane({ src, tooLarge, error, file }: { src: string | null; tooLarge: boolean; error: boolean; file: FileItem | null }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {file?.name ?? "—"}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 dark:bg-slate-900">
        {tooLarge && file && <span className="text-xs text-slate-400">Image too large to preview ({formatBytes(file.size)})</span>}
        {error && <span className="text-xs text-red-500">Preview unavailable</span>}
        {!tooLarge && !error && (src ? <img src={src} alt={file?.name} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Loading…</span>)}
      </div>
    </div>
  );
}

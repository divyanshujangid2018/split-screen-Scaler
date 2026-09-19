import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FileItem } from "@/types";
import { readBinaryPreviewBase64 } from "@/lib/backend";
import { loadPdfFromBase64, renderPdfPage } from "@/lib/pdf";
import { Button } from "@/components/ui/button";

function usePdfDoc(file: FileItem | null) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setDoc(null);
    setError(false);
    if (!file) return;
    let cancelled = false;
    readBinaryPreviewBase64(file.location)
      .then((b64) => loadPdfFromBase64(b64))
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [file]);

  return { doc, error };
}

function PdfPane({ file, doc, error, pageNumber }: { file: FileItem | null; doc: PDFDocumentProxy | null; error: boolean; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    const clampedPage = Math.min(Math.max(1, pageNumber), doc.numPages);
    renderPdfPage(doc, clampedPage, canvasRef.current).catch(() => {});
  }, [doc, pageNumber]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {file?.name ?? "—"} {doc ? `· page ${Math.min(pageNumber, doc.numPages)}/${doc.numPages}` : ""}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 dark:bg-slate-900">
        {error && <span className="text-xs text-red-500">Could not render this PDF</span>}
        {!error && !doc && file && <span className="text-xs text-slate-400">Loading…</span>}
        {!error && <canvas ref={canvasRef} className="max-h-full max-w-full shadow" />}
      </div>
    </div>
  );
}

export function PdfCompareView({ leftFile, rightFile }: { leftFile: FileItem | null; rightFile: FileItem | null }) {
  const left = usePdfDoc(leftFile);
  const right = usePdfDoc(rightFile);
  const [page, setPage] = useState(1);

  if (!leftFile && !rightFile) return null;

  const maxPages = Math.max(left.doc?.numPages ?? 1, right.doc?.numPages ?? 1);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-slate-200 py-1.5 dark:border-slate-800">
        <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-slate-500">Page {page} / {maxPages}</span>
        <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.min(maxPages, p + 1))} disabled={page >= maxPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className={rightFile && leftFile ? "grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800" : "min-h-0 flex-1"}>
        {leftFile && <PdfPane file={leftFile} doc={left.doc} error={left.error} pageNumber={page} />}
        {rightFile && <PdfPane file={rightFile} doc={right.doc} error={right.error} pageNumber={page} />}
      </div>
    </div>
  );
}

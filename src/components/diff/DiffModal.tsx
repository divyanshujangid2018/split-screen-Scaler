import { Suspense, lazy } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/comparison/StatusBadge";
import { TextDiffView } from "./TextDiffView";
import { ImageCompareView } from "./ImageCompareView";
import { UnsupportedCompareView } from "./UnsupportedCompareView";
import type { ComparisonCell, FileItem } from "@/types";

// pdfjs-dist is large and only needed when a PDF is actually opened, so it's split into
// its own chunk instead of bloating the app's startup bundle.
const PdfCompareView = lazy(() => import("./PdfCompareView").then((m) => ({ default: m.PdfCompareView })));

export interface DiffTarget {
  referenceFile: FileItem | null;
  cell: ComparisonCell;
  userName: string;
}

export function DiffModal({ target, onClose }: { target: DiffTarget | null; onClose: () => void }) {
  const open = target !== null;
  const referenceFile = target?.referenceFile ?? null;
  const otherFile = target?.cell.file ?? null;
  const previewKind = otherFile?.previewKind ?? referenceFile?.previewKind ?? "unsupported";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {open && (
        <DialogContent size="xl" className="flex flex-col p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <DialogTitle>Compare File</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              Reference vs {target.userName}
              <StatusBadge status={target.cell.status} />
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {previewKind === "text" && <TextDiffView leftFile={referenceFile} rightFile={otherFile} />}
            {previewKind === "image" && <ImageCompareView leftFile={referenceFile} rightFile={otherFile} />}
            {previewKind === "pdf" && (
              <Suspense fallback={<div className="p-4 text-sm text-slate-400">Loading PDF viewer…</div>}>
                <PdfCompareView leftFile={referenceFile} rightFile={otherFile} />
              </Suspense>
            )}
            {previewKind === "unsupported" && <UnsupportedCompareView leftFile={referenceFile} rightFile={otherFile} />}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

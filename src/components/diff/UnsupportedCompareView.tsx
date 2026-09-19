import { FileQuestion, ExternalLink } from "lucide-react";
import type { FileItem } from "@/types";
import { openInDefaultApp } from "@/lib/backend";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Card({ file }: { file: FileItem | null }) {
  if (!file) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-300 dark:text-slate-600">Missing</div>;
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <FileQuestion className="h-8 w-8 text-slate-400" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</span>
      <span className="text-xs text-slate-400">Preview unavailable</span>
      <span className="text-xs text-slate-400">Size: {formatBytes(file.size)}</span>
      {file.location.kind === "disk" && (
        <Button size="sm" variant="outline" onClick={() => openInDefaultApp(file.location)}>
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </Button>
      )}
    </div>
  );
}

export function UnsupportedCompareView({ leftFile, rightFile }: { leftFile: FileItem | null; rightFile: FileItem | null }) {
  if (!rightFile) return <Card file={leftFile} />;
  return (
    <div className="grid h-full grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
      <Card file={leftFile} />
      <Card file={rightFile} />
    </div>
  );
}

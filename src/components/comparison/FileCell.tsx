import { memo } from "react";
import type { ComparisonCell } from "@/types";
import { FileThumb } from "@/components/previews/FileThumb";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

interface FileCellProps {
  cell: ComparisonCell | undefined;
  width: number;
  isReference?: boolean;
  highlighted?: boolean;
  onOpen?: () => void;
}

function FileCellImpl({ cell, width, isReference, highlighted, onOpen }: FileCellProps) {
  const file = cell?.file ?? null;
  const clickable = Boolean(file && onOpen);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onOpen}
      style={{ width }}
      className={cn(
        "flex h-full shrink-0 flex-col gap-1 border-b border-r border-slate-200 px-2.5 py-2 text-left dark:border-slate-800",
        isReference ? "bg-red-50/40 dark:bg-red-950/20" : "bg-white dark:bg-slate-950",
        clickable && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900",
        highlighted && "ring-1 ring-inset ring-amber-400",
      )}
      title={file ? file.relativePath : undefined}
    >
      {file ? (
        <>
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{file.name}</span>
          <div className="min-h-0 flex-1 overflow-hidden">
            <FileThumb file={file} />
          </div>
          {cell && !isReference && (
            <div>
              <StatusBadge status={cell.status} />
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1">
          <span className="text-xs text-slate-300 dark:text-slate-600">MISSING</span>
          {cell && <StatusBadge status={cell.status} />}
        </div>
      )}
    </button>
  );
}

export const FileCell = memo(FileCellImpl);

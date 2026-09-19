import { useEffect, useState } from "react";
import type { FileItem } from "@/types";
import { readTextPreview } from "@/lib/backend";
import { useTextDiff } from "@/hooks/useTextDiff";
import { cn } from "@/lib/utils";

const MAX_DIFF_BYTES = 3_000_000;

interface Line {
  text: string;
  kind: "same" | "add" | "remove" | "blank";
}

function buildPanes(ops: { type: "same" | "add" | "remove"; text: string }[]): { left: Line[]; right: Line[] } {
  const left: Line[] = [];
  const right: Line[] = [];
  for (const op of ops) {
    if (op.type === "same") {
      left.push({ text: op.text, kind: "same" });
      right.push({ text: op.text, kind: "same" });
    } else if (op.type === "remove") {
      left.push({ text: op.text, kind: "remove" });
      right.push({ text: "", kind: "blank" });
    } else {
      left.push({ text: "", kind: "blank" });
      right.push({ text: op.text, kind: "add" });
    }
  }
  return { left, right };
}

function useFileText(file: FileItem | null) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    setError(null);
    if (!file) return;
    let cancelled = false;
    readTextPreview(file.location, MAX_DIFF_BYTES)
      .then((t) => !cancelled && setText(t))
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [file]);

  return { text, error };
}

export function TextDiffView({ leftFile, rightFile }: { leftFile: FileItem | null; rightFile: FileItem | null }) {
  const left = useFileText(leftFile);
  const right = useFileText(rightFile);
  const bothLoaded = left.text !== null && right.text !== null;
  const ops = useTextDiff(bothLoaded ? left.text : null, bothLoaded ? right.text : null);

  if (left.error || right.error) {
    return <div className="p-4 text-sm text-red-600">Could not read one of the files for comparison.</div>;
  }

  if (!leftFile && !rightFile) return null;

  if (!bothLoaded && (leftFile || rightFile)) {
    // Single-file preview (no counterpart to diff against).
    const only = leftFile ? left : right;
    return (
      <pre className="h-full overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xs">
        {only.text ?? "Loading…"}
      </pre>
    );
  }

  if (!ops) {
    return <div className="p-4 text-sm text-slate-400">Computing diff…</div>;
  }

  const { left: leftLines, right: rightLines } = buildPanes(ops);

  return (
    <div className="grid h-full grid-cols-2 divide-x divide-slate-200 overflow-hidden dark:divide-slate-800">
      <DiffPane title={leftFile?.name ?? "Reference"} lines={leftLines} />
      <DiffPane title={rightFile?.name ?? ""} lines={rightLines} />
    </div>
  );
}

function DiffPane({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        {title}
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-all px-3 py-0.5",
              line.kind === "add" && "diff-add",
              line.kind === "remove" && "diff-remove",
              line.kind === "blank" && "bg-slate-50/50 dark:bg-slate-900/40",
            )}
          >
            {line.text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

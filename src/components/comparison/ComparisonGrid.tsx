import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ComparisonRow, FileHashState, UserDataset } from "@/types";
import { UserHeaderCell } from "./UserHeaderCell";
import { FileCell } from "./FileCell";
import { useHorizontalScrollNav } from "@/hooks/useHorizontalScrollNav";

export const COLUMN_WIDTH = 300;
export const ROW_HEIGHT = 128;
export const HEADER_HEIGHT = 64;

export interface OpenCompareArgs {
  row: ComparisonRow;
  user: UserDataset;
}

interface ComparisonGridProps {
  reference: UserDataset;
  comparisonUsers: UserDataset[];
  rows: ComparisonRow[];
  fileHashes: Record<string, FileHashState>;
  onOpenCompare: (args: OpenCompareArgs) => void;
  scrollNav: ReturnType<typeof useHorizontalScrollNav>;
}

export function ComparisonGrid({ reference, comparisonUsers, rows, fileHashes, onOpenCompare, scrollNav }: ComparisonGridProps) {
  const { containerRef } = scrollNav;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const hashingCounts = useMemo(() => countHashingPerUser(comparisonUsers, fileHashes), [comparisonUsers, fileHashes]);
  const totalWidth = COLUMN_WIDTH * (comparisonUsers.length + 1);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto outline-none"
      tabIndex={0}
      role="grid"
      aria-rowcount={rows.length}
    >
      <div style={{ width: Math.max(totalWidth, 0), minWidth: "100%" }}>
        {/* Sticky header row */}
        <div className="sticky top-0 z-30 flex" style={{ height: HEADER_HEIGHT }}>
          <div className="sticky left-0 z-40" style={{ width: COLUMN_WIDTH }}>
            <UserHeaderCell user={reference} width={COLUMN_WIDTH} />
          </div>
          {comparisonUsers.map((u) => (
            <UserHeaderCell key={u.id} user={u} width={COLUMN_WIDTH} hashingCount={hashingCounts.get(u.id) ?? 0} />
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            No files match the current search/filter.
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
              return (
                <div
                  key={row.id}
                  className="absolute left-0 top-0 flex w-full"
                  style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
                  role="row"
                >
                  <div className="sticky left-0 z-10" style={{ width: COLUMN_WIDTH }}>
                    <FileCell
                      cell={row.referenceFile ? { file: row.referenceFile, status: "same", confidence: "exact" } : undefined}
                      width={COLUMN_WIDTH}
                      isReference
                    />
                  </div>
                  {comparisonUsers.map((u) => (
                    <FileCell
                      key={u.id}
                      cell={row.cells[u.id]}
                      width={COLUMN_WIDTH}
                      onOpen={row.cells[u.id]?.file ? () => onOpenCompare({ row, user: u }) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function countHashingPerUser(users: UserDataset[], fileHashes: Record<string, FileHashState>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const u of users) {
    let n = 0;
    for (const f of u.files) {
      if (fileHashes[f.id]?.status === "hashing") n++;
    }
    counts.set(u.id, n);
  }
  return counts;
}

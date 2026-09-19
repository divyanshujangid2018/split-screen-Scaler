import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useComparisonRows } from "@/hooks/useComparisonRows";
import { useAutoHash } from "@/hooks/useAutoHash";
import { useHorizontalScrollNav } from "@/hooks/useHorizontalScrollNav";
import { TopBar } from "@/components/app/TopBar";
import { SetupScreen } from "@/components/users/SetupScreen";
import { UserManagerDialog } from "@/components/users/UserManagerDialog";
import { Toolbar } from "@/components/comparison/Toolbar";
import { ComparisonGrid, COLUMN_WIDTH, type OpenCompareArgs } from "@/components/comparison/ComparisonGrid";
import { DiffModal, type DiffTarget } from "@/components/diff/DiffModal";
import type { ComparisonRow, StatusFilter } from "@/types";

function filterRows(rows: ComparisonRow[], query: string, statusFilter: StatusFilter): ComparisonRow[] {
  let result = rows;
  if (statusFilter !== "all") {
    result = result.filter((r) => Object.values(r.cells).some((c) => c.status === statusFilter));
  }
  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter((r) => r.searchKey.includes(q));
  }
  return result;
}

export default function App() {
  const users = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const fileHashes = useAppStore((s) => s.fileHashes);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reference = users.find((u) => u.isReference);
  const comparisonUsers = useMemo(
    () => users.filter((u) => !u.isReference).sort((a, b) => a.order - b.order),
    [users],
  );

  const readyToCompare = Boolean(reference && reference.status === "ready" && comparisonUsers.length > 0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (started && !readyToCompare) setStarted(false);
  }, [started, readyToCompare]);

  const rows = useComparisonRows(reference, comparisonUsers, fileHashes);
  useAutoHash(rows);

  const visibleRows = useMemo(() => filterRows(rows, searchQuery, statusFilter), [rows, searchQuery, statusFilter]);

  const scrollNav = useHorizontalScrollNav(COLUMN_WIDTH);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenCompare({ row, user }: OpenCompareArgs) {
    const cell = row.cells[user.id];
    if (!cell) return;
    setDiffTarget({ referenceFile: row.referenceFile, cell, userName: user.name });
  }

  if (!hydrated) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        users={users}
        onOpenUsers={() => setUsersDialogOpen(true)}
        onBackToSetup={() => setStarted(false)}
        showBackToSetup={started}
      />

      {!started || !reference ? (
        <SetupScreen users={users} onStart={() => setStarted(true)} />
      ) : (
        <>
          <Toolbar comparisonCount={comparisonUsers.length} scrollNav={scrollNav} searchInputRef={searchInputRef} />
          <ComparisonGrid
            reference={reference}
            comparisonUsers={comparisonUsers}
            rows={visibleRows}
            fileHashes={fileHashes}
            onOpenCompare={handleOpenCompare}
            scrollNav={scrollNav}
          />
        </>
      )}

      <UserManagerDialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen} />
      <DiffModal target={diffTarget} onClose={() => setDiffTarget(null)} />
    </div>
  );
}

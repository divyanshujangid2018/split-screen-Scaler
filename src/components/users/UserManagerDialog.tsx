import { useState } from "react";
import { GripVertical, Star, Trash2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddSourceButtons } from "./AddSourceButtons";
import { useAppStore } from "@/store/appStore";
import type { UserDataset } from "@/types";
import { cn } from "@/lib/utils";

export function UserManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const users = useAppStore((s) => s.users);
  const removeUser = useAppStore((s) => s.removeUser);
  const renameUser = useAppStore((s) => s.renameUser);
  const setReference = useAppStore((s) => s.setReference);
  const reindexUser = useAppStore((s) => s.reindexUser);
  const reorderComparisonUsers = useAppStore((s) => s.reorderComparisonUsers);

  const reference = users.find((u) => u.isReference);
  const comparisonUsers = [...users.filter((u) => !u.isReference)].sort((a, b) => a.order - b.order);

  const [dragId, setDragId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = comparisonUsers.map((u) => u.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderComparisonUsers(ids);
    setDragId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent size="lg" className="max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <DialogTitle>Users</DialogTitle>
            <DialogDescription>Add, rename, reorder, or change the reference user. Reference always stays first.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-auto p-5">
            <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-700" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-400">Reference</span>
                <span className="text-sm">{reference?.name}</span>
                <span className="text-xs text-slate-500">{reference?.sourceName}</span>
              </div>
              <AddSourceButtons isReference size="sm" />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">Comparison Users ({comparisonUsers.length})</span>
              <AddSourceButtons isReference={false} size="sm" />
            </div>

            <ul className="flex flex-col gap-1.5">
              {comparisonUsers.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  dragging={dragId === u.id}
                  onDragStart={() => setDragId(u.id)}
                  onDrop={() => handleDrop(u.id)}
                  onRename={(name) => renameUser(u.id, name)}
                  onRemove={() => removeUser(u.id)}
                  onMakeReference={() => setReference(u.id)}
                  onReindex={() => reindexUser(u.id)}
                />
              ))}
            </ul>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function UserRow({
  user,
  dragging,
  onDragStart,
  onDrop,
  onRename,
  onRemove,
  onMakeReference,
  onReindex,
}: {
  user: UserDataset;
  dragging: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onMakeReference: () => void;
  onReindex: () => void;
}) {
  const [name, setName] = useState(user.name);

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 dark:border-slate-800",
        dragging && "opacity-50",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: user.color }} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && onRename(name.trim())}
        className="h-7 w-28 text-xs"
      />
      <span className="flex-1 truncate text-xs text-slate-500">{user.sourceName}</span>
      <span className="shrink-0 text-xs text-slate-400">
        {user.status === "ready" ? `${user.files.length} files` : user.status}
      </span>
      <Button variant="ghost" size="icon" title="Re-index from source" onClick={onReindex}>
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" title="Make reference" onClick={onMakeReference}>
        <Star className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" title="Remove" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

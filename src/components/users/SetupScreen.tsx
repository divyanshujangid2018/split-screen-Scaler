import { CheckCircle2, Loader2, X } from "lucide-react";
import { AddSourceButtons } from "./AddSourceButtons";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import type { UserDataset } from "@/types";
import { PrivacyBadge } from "@/components/app/PrivacyBadge";

export function SetupScreen({ users, onStart }: { users: UserDataset[]; onStart: () => void }) {
  const reference = users.find((u) => u.isReference);
  const comparisonUsers = users.filter((u) => !u.isReference).sort((a, b) => a.order - b.order);
  const removeUser = useAppStore((s) => s.removeUser);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-8 overflow-auto px-6 py-10">
      <div className="text-center">
        <h1 className="text-xl font-semibold">FileCompare</h1>
        <p className="mt-1 text-sm text-slate-500">Compare files across many users, side by side, entirely on this machine.</p>
        <PrivacyBadge className="mt-3 justify-center" />
      </div>

      <section className="w-full rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-red-800 dark:text-red-400">Step 1 · Select Reference User</h2>
        <p className="mt-1 text-xs text-slate-500">The reference is the baseline every other user is compared against. Only one is allowed.</p>
        <div className="mt-3">
          <AddSourceButtons isReference />
        </div>
        <div className="mt-4">
          {reference ? (
            <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-700" /> REFERENCE USER
                </div>
                <div className="text-sm">{reference.sourceName}</div>
                <div className="text-xs text-slate-500">
                  {reference.status === "indexing" ? "Indexing…" : `${reference.files.length} files`}
                </div>
              </div>
              {reference.status === "indexing" && <Loader2 className="h-4 w-4 animate-spin text-red-700" />}
              {reference.status === "ready" && <CheckCircle2 className="h-4 w-4 text-red-700" />}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700">
              Not selected
            </div>
          )}
        </div>
      </section>

      <section className="w-full rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Step 2 · Add Comparison Users</h2>
        <p className="mt-1 text-xs text-slate-500">Add as many as you need &mdash; 12, 15, or more.</p>
        <div className="mt-3">
          <AddSourceButtons isReference={false} />
        </div>
        <ul className="mt-4 flex flex-col gap-1.5">
          {comparisonUsers.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <div>
                <span className="font-medium">{u.name}</span>{" "}
                <span className="text-xs text-slate-400">{u.sourceName}</span>
                <div className="text-xs text-slate-500">
                  {u.status === "indexing" && "Indexing…"}
                  {u.status === "ready" && `${u.files.length} files`}
                  {u.status === "error" && <span className="text-red-600">{u.error}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.status === "indexing" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {u.status === "ready" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <Button variant="ghost" size="icon" onClick={() => removeUser(u.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {comparisonUsers.length === 0 && <li className="text-center text-xs text-slate-400">No comparison users yet.</li>}
        </ul>
      </section>

      <Button size="lg" disabled={!reference || reference.status !== "ready" || comparisonUsers.length === 0} onClick={onStart}>
        Start Comparing
      </Button>
    </div>
  );
}

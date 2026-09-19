import { memo } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { UserDataset } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  user: UserDataset;
  width: number;
  hashingCount?: number;
}

function UserHeaderCellImpl({ user, width, hashingCount = 0 }: Props) {
  const isRef = user.isReference;
  return (
    <div
      style={{ width, background: isRef ? "var(--color-reference)" : user.color }}
      className={cn(
        "flex h-full shrink-0 flex-col justify-center gap-0.5 border-b border-r border-black/10 px-3 py-2 text-white",
      )}
    >
      <div className="flex items-center gap-1.5">
        {isRef && <span className="h-2 w-2 shrink-0 rounded-full bg-red-300" aria-hidden />}
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
          {isRef ? "Reference" : user.name}
        </span>
      </div>
      <span className="truncate text-xs font-medium text-white" title={user.sourceName}>
        {user.sourceName}
      </span>
      <div className="flex items-center gap-1.5 text-[11px] text-white/75">
        {user.status === "indexing" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Indexing…
          </>
        )}
        {user.status === "error" && (
          <>
            <AlertTriangle className="h-3 w-3" /> {user.error ?? "Error"}
          </>
        )}
        {user.status === "ready" && (
          <>
            {hashingCount > 0 ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Comparing {hashingCount}…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" /> {user.files.length} files
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const UserHeaderCell = memo(UserHeaderCellImpl);

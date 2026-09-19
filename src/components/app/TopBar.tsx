import { Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivacyBadge } from "./PrivacyBadge";
import type { UserDataset } from "@/types";

export function TopBar({
  users,
  onOpenUsers,
  onBackToSetup,
  showBackToSetup,
}: {
  users: UserDataset[];
  onOpenUsers: () => void;
  onBackToSetup: () => void;
  showBackToSetup: boolean;
}) {
  const reference = users.find((u) => u.isReference);
  const comparisonCount = users.filter((u) => !u.isReference).length;

  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
      <span className="text-sm font-semibold">FileCompare</span>
      {showBackToSetup && (
        <span className="text-xs text-slate-500">
          Users: {users.length} &nbsp;·&nbsp; Reference: {reference?.name ?? "—"} &nbsp;·&nbsp; Comparing: {comparisonCount}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <PrivacyBadge />
        {showBackToSetup && (
          <Button variant="ghost" size="sm" onClick={onBackToSetup}>
            Setup
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onOpenUsers}>
          <UsersIcon className="h-4 w-4" /> Users
        </Button>
      </div>
    </div>
  );
}

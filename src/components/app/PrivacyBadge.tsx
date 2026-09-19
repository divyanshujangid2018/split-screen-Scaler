import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrivacyBadge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-slate-500", className)} title="Files are processed on this computer and never leave it.">
      <Lock className="h-3.5 w-3.5" />
      <span>Local Only &mdash; files are processed on this computer</span>
    </div>
  );
}

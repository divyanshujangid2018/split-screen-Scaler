import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StatusFilter } from "@/types";
import { useAppStore } from "@/store/appStore";
import type { useHorizontalScrollNav } from "@/hooks/useHorizontalScrollNav";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "same", label: "Same" },
  { value: "modified", label: "Modified" },
  { value: "missing", label: "Missing" },
  { value: "new", label: "New" },
  { value: "renamed", label: "Renamed" },
  { value: "uncertain", label: "Uncertain" },
  { value: "unsupported", label: "Unsupported" },
];

interface ToolbarProps {
  comparisonCount: number;
  scrollNav: ReturnType<typeof useHorizontalScrollNav>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function Toolbar({ comparisonCount, scrollNav, searchInputRef }: ToolbarProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const setStatusFilter = useAppStore((s) => s.setStatusFilter);

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files, paths, users…"
          className="h-8 pl-7 text-xs"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Filter{statusFilter !== "all" ? `: ${statusFilter}` : ""}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Show rows</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FILTERS.map((f) => (
            <DropdownMenuCheckboxItem key={f.value} checked={statusFilter === f.value} onCheckedChange={() => setStatusFilter(f.value)}>
              {f.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={scrollNav.scrollToStart} title="Home">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => scrollNav.scrollByColumns(-1)} title="Previous user">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[92px] text-center text-xs text-slate-500">
          {comparisonCount === 0 ? "No users" : `${Math.min(scrollNav.firstVisibleIndex + 1, comparisonCount)} / ${comparisonCount} users`}
        </span>
        <Button variant="ghost" size="icon" onClick={() => scrollNav.scrollByColumns(1)} title="Next user">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={scrollNav.scrollToEnd} title="End">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

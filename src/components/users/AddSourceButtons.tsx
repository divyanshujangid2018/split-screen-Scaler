import { FileArchive, FolderOpen, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";

export function AddSourceButtons({ isReference, size = "default" }: { isReference: boolean; size?: "default" | "sm" }) {
  const addUserFromSource = useAppStore((s) => s.addUserFromSource);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} variant="outline" onClick={() => addUserFromSource("zip", isReference)}>
        <FileArchive className="h-4 w-4" /> Add ZIP
      </Button>
      <Button size={size} variant="outline" onClick={() => addUserFromSource("folder", isReference)}>
        <FolderOpen className="h-4 w-4" /> Add Folder
      </Button>
      <Button size={size} variant="outline" onClick={() => addUserFromSource("files", isReference)}>
        <Files className="h-4 w-4" /> Add Files
      </Button>
    </div>
  );
}

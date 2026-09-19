import { create } from "zustand";
import type { FileHashState, SourceType, StatusFilter, UserDataset } from "@/types";
import { indexFiles, indexFolder, indexZip, pickFiles, pickFolder, pickZipFile } from "@/lib/backend";
import { colorForIndex, REFERENCE_COLOR } from "@/lib/color";
import {
  hydrateCache,
  isCacheDirty,
  loadCacheSnapshot,
  markCacheClean,
} from "@/lib/hashQueue";
import { loadHashCache, loadWorkspace, saveHashCache, saveWorkspace, type PersistedUser } from "@/lib/persistence";

function basename(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path;
}

interface AppState {
  users: UserDataset[];
  searchQuery: string;
  statusFilter: StatusFilter;
  hydrated: boolean;
  /** Content-hash state per FileItem.id, kept separate from `users` so a hash resolving
   *  never invalidates the (expensive) file-matching memo - only the (cheap) row status. */
  fileHashes: Record<string, FileHashState>;

  hydrate: () => Promise<void>;

  addUserFromSource: (sourceType: SourceType, isReference: boolean) => Promise<void>;
  reindexUser: (userId: string) => Promise<void>;
  removeUser: (userId: string) => void;
  renameUser: (userId: string, name: string) => void;
  setReference: (userId: string) => void;
  reorderComparisonUsers: (orderedIds: string[]) => void;

  setSearchQuery: (q: string) => void;
  setStatusFilter: (f: StatusFilter) => void;

  markHashing: (fileId: string) => void;
  updateFileHash: (fileId: string, result: { hash?: string; error?: string }) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => AppState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { users, statusFilter } = get();
    const persistedUsers: PersistedUser[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      sourceType: u.sourceType,
      sourceName: u.sourceName,
      sourcePath: u.sourcePath,
      filePaths: u.sourceType === "files" ? u.files.map((f) => f.location.path) : undefined,
      isReference: u.isReference,
      order: u.order,
    }));
    void saveWorkspace({ users: persistedUsers, statusFilter });
    if (isCacheDirty()) {
      void saveHashCache(loadCacheSnapshot());
      markCacheClean();
    }
  }, 800);
}

async function runIndex(sourceType: SourceType, sourcePath: string | undefined, filePaths: string[] | undefined) {
  if (sourceType === "zip" && sourcePath) return indexZip(sourcePath);
  if (sourceType === "folder" && sourcePath) return indexFolder(sourcePath);
  if (sourceType === "files" && filePaths) return indexFiles(filePaths);
  throw new Error("Invalid source configuration");
}

export const useAppStore = create<AppState>((set, get) => ({
  users: [],
  searchQuery: "",
  statusFilter: "all",
  hydrated: false,
  fileHashes: {},

  hydrate: async () => {
    const [workspace, cache] = await Promise.all([loadWorkspace(), loadHashCache()]);
    hydrateCache(cache);
    if (!workspace || workspace.users.length === 0) {
      set({ hydrated: true, statusFilter: (workspace?.statusFilter as StatusFilter) ?? "all" });
      return;
    }
    const users: UserDataset[] = workspace.users.map((pu) => ({
      id: pu.id,
      name: pu.name,
      color: pu.color,
      sourceType: pu.sourceType,
      sourceName: pu.sourceName,
      sourcePath: pu.sourcePath,
      files: [],
      isReference: pu.isReference,
      status: "indexing",
      progress: 0,
      order: pu.order,
    }));
    set({ users, hydrated: true, statusFilter: (workspace.statusFilter as StatusFilter) ?? "all" });

    for (const pu of workspace.users) {
      try {
        const { files, errors } = await runIndex(pu.sourceType, pu.sourcePath, pu.filePaths);
        set((s) => ({
          users: s.users.map((u) =>
            u.id === pu.id
              ? { ...u, files, status: "ready", progress: 100, error: errors[0] }
              : u,
          ),
        }));
      } catch (e) {
        set((s) => ({
          users: s.users.map((u) => (u.id === pu.id ? { ...u, status: "error", error: String(e) } : u)),
        }));
      }
    }
  },

  addUserFromSource: async (sourceType, isReference) => {
    let sourcePath: string | undefined;
    let filePaths: string[] | undefined;
    let sourceName: string;

    if (sourceType === "zip") {
      const path = await pickZipFile();
      if (!path) return;
      sourcePath = path;
      sourceName = basename(path);
    } else if (sourceType === "folder") {
      const path = await pickFolder();
      if (!path) return;
      sourcePath = path;
      sourceName = basename(path);
    } else {
      const paths = await pickFiles();
      if (!paths || paths.length === 0) return;
      filePaths = paths;
      sourceName = paths.length === 1 ? basename(paths[0]) : `${paths.length} files`;
    }

    const state = get();
    const comparisonCount = state.users.filter((u) => !u.isReference).length;
    const id = crypto.randomUUID();
    const newUser: UserDataset = {
      id,
      name: isReference ? "Reference User" : `User ${String(comparisonCount + 2).padStart(2, "0")}`,
      color: isReference ? REFERENCE_COLOR : colorForIndex(comparisonCount),
      sourceType,
      sourceName,
      sourcePath,
      files: [],
      isReference,
      status: "indexing",
      progress: 0,
      order: isReference ? -1 : state.users.length,
    };

    set((s) => ({
      users: isReference ? [newUser, ...s.users.filter((u) => !u.isReference)] : [...s.users, newUser],
    }));

    try {
      const { files, errors } = await runIndex(sourceType, sourcePath, filePaths);
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, files, status: "ready", progress: 100, error: errors[0] } : u)),
      }));
    } catch (e) {
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, status: "error", error: String(e) } : u)),
      }));
    }
    schedulePersist(get);
  },

  reindexUser: async (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, status: "indexing" } : u)) }));
    try {
      const filePaths = user.sourceType === "files" ? user.files.map((f) => f.location.path) : undefined;
      const { files, errors } = await runIndex(user.sourceType, user.sourcePath, filePaths);
      set((s) => ({
        users: s.users.map((u) => (u.id === userId ? { ...u, files, status: "ready", progress: 100, error: errors[0] } : u)),
      }));
    } catch (e) {
      set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, status: "error", error: String(e) } : u)) }));
    }
    schedulePersist(get);
  },

  removeUser: (userId) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== userId) }));
    schedulePersist(get);
  },

  renameUser: (userId, name) => {
    set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, name } : u)) }));
    schedulePersist(get);
  },

  setReference: (userId) => {
    set((s) => ({
      users: s.users.map((u) => {
        if (u.id === userId) return { ...u, isReference: true, color: REFERENCE_COLOR, order: -1 };
        if (u.isReference) return { ...u, isReference: false, color: colorForIndex(0), order: 0 };
        return u;
      }),
    }));
    schedulePersist(get);
  },

  reorderComparisonUsers: (orderedIds) => {
    set((s) => {
      const orderIndex = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        users: s.users.map((u) => (u.isReference ? u : { ...u, order: orderIndex.get(u.id) ?? u.order })),
      };
    });
    schedulePersist(get);
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (f) => {
    set({ statusFilter: f });
    schedulePersist(get);
  },

  markHashing: (fileId) => {
    set((s) => ({ fileHashes: { ...s.fileHashes, [fileId]: { status: "hashing" } } }));
  },

  updateFileHash: (fileId, result) => {
    set((s) => ({
      fileHashes: {
        ...s.fileHashes,
        [fileId]: result.hash ? { status: "done", hash: result.hash } : { status: "error" },
      },
    }));
  },
}));

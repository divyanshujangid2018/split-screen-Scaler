import { load, type Store } from "@tauri-apps/plugin-store";
import type { SourceType } from "@/types";

export interface PersistedUser {
  id: string;
  name: string;
  color: string;
  sourceType: SourceType;
  sourceName: string;
  sourcePath?: string;
  filePaths?: string[];
  isReference: boolean;
  order: number;
}

export interface PersistedWorkspace {
  users: PersistedUser[];
  statusFilter: string;
}

let workspaceStore: Store | null = null;
let hashCacheStore: Store | null = null;

async function getWorkspaceStore(): Promise<Store> {
  if (!workspaceStore) {
    workspaceStore = await load("workspace.json", { autoSave: false });
  }
  return workspaceStore;
}

async function getHashCacheStore(): Promise<Store> {
  if (!hashCacheStore) {
    hashCacheStore = await load("hash-cache.json", { autoSave: false });
  }
  return hashCacheStore;
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
  try {
    const store = await getWorkspaceStore();
    const users = (await store.get<PersistedUser[]>("users")) ?? null;
    if (!users) return null;
    const statusFilter = (await store.get<string>("statusFilter")) ?? "all";
    return { users, statusFilter };
  } catch {
    return null;
  }
}

export async function saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
  try {
    const store = await getWorkspaceStore();
    await store.set("users", workspace.users);
    await store.set("statusFilter", workspace.statusFilter);
    await store.save();
  } catch {
    // Persistence is best-effort; the app still works fully in-memory if this fails.
  }
}

export async function loadHashCache(): Promise<Record<string, string>> {
  try {
    const store = await getHashCacheStore();
    return (await store.get<Record<string, string>>("entries")) ?? {};
  } catch {
    return {};
  }
}

export async function saveHashCache(entries: Record<string, string>): Promise<void> {
  try {
    const store = await getHashCacheStore();
    await store.set("entries", entries);
    await store.save();
  } catch {
    // best-effort
  }
}

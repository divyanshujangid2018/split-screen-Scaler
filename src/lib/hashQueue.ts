import type { FileItem } from "@/types";
import { hashFileLocation } from "./backend";

const MAX_CONCURRENT = 4;

type Listener = (result: { hash?: string; error?: string }) => void;

const cache = new Map<string, string>();
let cacheDirty = false;

const queue: { file: FileItem; listener: Listener }[] = [];
const inFlight = new Set<string>();
let active = 0;

export function cacheKeyFor(file: FileItem): string {
  const { location } = file;
  return `${location.kind}:${location.path}:${location.entryName ?? ""}:${file.size}:${file.modifiedAt ?? ""}`;
}

export function loadCacheSnapshot(): Record<string, string> {
  return Object.fromEntries(cache);
}

export function hydrateCache(entries: Record<string, string>) {
  for (const [k, v] of Object.entries(entries)) cache.set(k, v);
}

export function isCacheDirty(): boolean {
  return cacheDirty;
}

export function markCacheClean() {
  cacheDirty = false;
}

export function enqueueHash(file: FileItem, listener: Listener) {
  const key = cacheKeyFor(file);
  const cached = cache.get(key);
  if (cached) {
    listener({ hash: cached });
    return;
  }
  if (inFlight.has(file.id)) return;
  inFlight.add(file.id);
  queue.push({ file, listener });
  pump();
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    active++;
    hashFileLocation(job.file.location)
      .then((hash) => {
        cache.set(cacheKeyFor(job.file), hash);
        cacheDirty = true;
        job.listener({ hash });
      })
      .catch((err) => {
        job.listener({ error: String(err) });
      })
      .finally(() => {
        active--;
        inFlight.delete(job.file.id);
        pump();
      });
  }
}

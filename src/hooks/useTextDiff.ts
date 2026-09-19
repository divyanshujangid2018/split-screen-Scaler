import { useEffect, useRef, useState } from "react";
import type { DiffLineOp, DiffWorkerResponse } from "@/workers/diff.worker";

let nextId = 1;

export function useTextDiff(left: string | null, right: string | null) {
  const [ops, setOps] = useState<DiffLineOp[] | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/diff.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (left === null || right === null) {
      setOps(null);
      return;
    }
    const worker = workerRef.current;
    if (!worker) return;
    const id = nextId++;
    setOps(null);
    const onMessage = (e: MessageEvent<DiffWorkerResponse>) => {
      if (e.data.id !== id) return;
      setOps(e.data.ops);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, left, right });
    return () => worker.removeEventListener("message", onMessage);
  }, [left, right]);

  return ops;
}

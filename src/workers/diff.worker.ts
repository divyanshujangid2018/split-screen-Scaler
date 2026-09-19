import { diffLines } from "diff";

export interface DiffWorkerRequest {
  id: number;
  left: string;
  right: string;
}

export interface DiffLineOp {
  type: "same" | "add" | "remove";
  text: string;
}

export interface DiffWorkerResponse {
  id: number;
  ops: DiffLineOp[];
}

self.onmessage = (e: MessageEvent<DiffWorkerRequest>) => {
  const { id, left, right } = e.data;
  const parts = diffLines(left, right);
  const ops: DiffLineOp[] = [];
  for (const part of parts) {
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const type: DiffLineOp["type"] = part.added ? "add" : part.removed ? "remove" : "same";
    for (const line of lines) ops.push({ type, text: line });
  }
  const response: DiffWorkerResponse = { id, ops };
  (self as unknown as Worker).postMessage(response);
};

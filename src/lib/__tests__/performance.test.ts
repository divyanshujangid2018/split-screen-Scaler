import { describe, expect, it } from "vitest";
import { buildRowsFromMatches, computeMatches } from "@/lib/comparison";
import { makeFile, makeUser } from "@/test/helpers";
import type { FileItem, UserDataset } from "@/types";

const USER_COUNT = 15;
const FILES_PER_USER = 500;

function buildDataset(): { reference: UserDataset; comparisonUsers: UserDataset[] } {
  const referenceFiles: FileItem[] = Array.from({ length: FILES_PER_USER }, (_, i) =>
    makeFile({ name: `file_${i}.txt`, relativePath: `folder${i % 10}/file_${i}.txt`, size: 100 + i }),
  );
  const reference = makeUser({ id: "reference", isReference: true, files: referenceFiles, order: -1 });

  const comparisonUsers: UserDataset[] = Array.from({ length: USER_COUNT - 1 }, (_, u) => {
    const files: FileItem[] = referenceFiles.map((ref, i) => {
      const bucket = (i + u) % 10;
      if (bucket === 0) return null; // missing
      if (bucket === 1) return makeFile({ name: ref.name, relativePath: ref.relativePath, size: ref.size + 5 }); // modified
      return makeFile({ name: ref.name, relativePath: ref.relativePath, size: ref.size }); // identical (pending until hashed)
    }).filter((f): f is FileItem => f !== null);
    files.push(makeFile({ name: `extra_${u}.txt`, relativePath: `extra_${u}.txt` })); // a new file per user
    return makeUser({ id: `user-${u}`, files, order: u });
  });

  return { reference, comparisonUsers };
}

describe("performance: 15 users x 500 files", () => {
  it("computes matches for the full synthetic dataset within budget", () => {
    const { reference, comparisonUsers } = buildDataset();
    const start = performance.now();
    const matches = computeMatches(reference, comparisonUsers);
    const elapsed = performance.now() - start;

    expect(matches.size).toBe(comparisonUsers.length);
    expect(elapsed).toBeLessThan(2000);
  });

  it("rebuilding rows after a hash resolves is cheap (does not re-run matching)", () => {
    const { reference, comparisonUsers } = buildDataset();
    const matches = computeMatches(reference, comparisonUsers);

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      // Simulates 50 hash results streaming in one at a time during indexing.
      buildRowsFromMatches(reference, comparisonUsers, matches, () => undefined);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });
});

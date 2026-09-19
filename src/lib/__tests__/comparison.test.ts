import { describe, expect, it } from "vitest";
import { buildRowsFromMatches, computeMatches } from "@/lib/comparison";
import { makeFile, makeUser, hashMap } from "@/test/helpers";

describe("buildRowsFromMatches", () => {
  it("marks identical-hash files as same", () => {
    const refFile = makeFile({ name: "a.txt", size: 10 });
    const cmpFile = makeFile({ name: "a.txt", size: 10 });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [cmpFile] });
    const hashes = hashMap([[refFile, "hash1"], [cmpFile, "hash1"]]);

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, (id) => hashes[id]);

    expect(rows).toHaveLength(1);
    expect(rows[0].cells["u2"].status).toBe("same");
  });

  it("marks different-size files as modified without needing a hash", () => {
    const refFile = makeFile({ name: "a.txt", size: 10 });
    const cmpFile = makeFile({ name: "a.txt", size: 20 });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [cmpFile] });

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, () => undefined);

    expect(rows[0].cells["u2"].status).toBe("modified");
  });

  it("marks same-size-but-different-hash files as modified", () => {
    const refFile = makeFile({ name: "a.txt", size: 10 });
    const cmpFile = makeFile({ name: "a.txt", size: 10 });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [cmpFile] });
    const hashes = hashMap([[refFile, "hash1"], [cmpFile, "hash2"]]);

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, (id) => hashes[id]);

    expect(rows[0].cells["u2"].status).toBe("modified");
  });

  it("marks a missing file as missing without shifting other rows", () => {
    const refA = makeFile({ name: "a.txt" });
    const refB = makeFile({ name: "b.txt" });
    const cmpB = makeFile({ name: "b.txt" });
    const reference = makeUser({ id: "ref", isReference: true, files: [refA, refB] });
    const user = makeUser({ id: "u2", files: [cmpB] });
    const hashes = hashMap([[refB, "h"], [cmpB, "h"]]);

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, (id) => hashes[id]);

    expect(rows).toHaveLength(2);
    expect(rows[0].referenceFile?.name).toBe("a.txt");
    expect(rows[0].cells["u2"].status).toBe("missing");
    expect(rows[1].referenceFile?.name).toBe("b.txt");
    expect(rows[1].cells["u2"].status).toBe("same");
  });

  it("groups a file with no reference counterpart into a trailing 'new' row", () => {
    const refFile = makeFile({ name: "a.txt" });
    const extraFile = makeFile({ name: "extra.txt" });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [extraFile] });

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, () => undefined);

    expect(rows).toHaveLength(2);
    const newRow = rows.find((r) => r.isExtraRow);
    expect(newRow?.cells["u2"].status).toBe("new");
    expect(newRow?.referenceFile).toBeNull();
  });

  it("flags identical content matched via basename-only (name differs) as renamed", () => {
    // "config.yaml" / "config.json" only match via the basename-without-extension tier
    // ("likely"), so a name difference there should surface as a rename, not silently as same.
    const refFile = makeFile({ name: "config.yaml", size: 10 });
    const cmpFile = makeFile({ name: "config.json", size: 10 });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [cmpFile] });
    const hashes = hashMap([[refFile, "same-hash"], [cmpFile, "same-hash"]]);

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, (id) => hashes[id]);

    expect(rows[0].cells["u2"].confidence).toBe("likely");
    expect(rows[0].cells["u2"].status).toBe("renamed");
  });

  it("marks a fuzzy 'possible' match as uncertain instead of same/modified", () => {
    const refFile = makeFile({ name: "user_profile.json", size: 10 });
    const cmpFile = makeFile({ name: "user_proflie.json", size: 10 });
    const reference = makeUser({ id: "ref", isReference: true, files: [refFile] });
    const user = makeUser({ id: "u2", files: [cmpFile] });
    const hashes = hashMap([[refFile, "h"], [cmpFile, "h"]]);

    const matches = computeMatches(reference, [user]);
    const rows = buildRowsFromMatches(reference, [user], matches, (id) => hashes[id]);

    expect(rows[0].cells["u2"].status).toBe("uncertain");
  });
});

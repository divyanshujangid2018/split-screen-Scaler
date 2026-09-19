import { describe, expect, it } from "vitest";
import { matchAgainstReference } from "@/lib/fileMatching";
import { makeFile } from "@/test/helpers";

describe("matchAgainstReference", () => {
  it("matches identical relative paths exactly", () => {
    const ref = [makeFile({ name: "Login.apk", relativePath: "app/Login.apk" })];
    const cmp = [makeFile({ name: "Login.apk", relativePath: "app/Login.apk" })];
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("exact");
    expect(matches.get(ref[0].id)?.file.id).toBe(cmp[0].id);
  });

  it("treats a case-insensitive path match as exact (same file on a case-insensitive filesystem)", () => {
    const ref = [makeFile({ name: "Login.apk" })];
    const cmp = [makeFile({ name: "LOGIN.apk" })];
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("exact");
  });

  it("matches case-different filenames in different folders as likely (normalized name)", () => {
    const ref = [makeFile({ name: "Login.apk", relativePath: "app/Login.apk" })];
    const cmp = [makeFile({ name: "LOGIN.apk", relativePath: "components/LOGIN.apk" })];
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("likely");
  });

  it("matches version-suffixed filenames as likely", () => {
    const ref = [makeFile({ name: "Login.apk" })];
    const cmp = [makeFile({ name: "Login_v2.apk" })];
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("likely");
  });

  it("reports missing when no comparison file exists", () => {
    const ref = [makeFile({ name: "Settings.json" })];
    const { matches, unmatched } = matchAgainstReference(ref, []);
    expect(matches.get(ref[0].id)).toBeNull();
    expect(unmatched).toHaveLength(0);
  });

  it("leaves unrelated comparison files as unmatched (new)", () => {
    const ref = [makeFile({ name: "Settings.json" })];
    const cmp = [makeFile({ name: "Extra.json" })];
    const { matches, unmatched } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)).toBeNull();
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].name).toBe("Extra.json");
  });

  it("matches the same base name across different extensions, but only as 'likely'", () => {
    const ref = [makeFile({ name: "readme.txt" })];
    const cmp = [makeFile({ name: "readme.md" })];
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("likely");
  });

  it("never matches genuinely unrelated files just because extensions differ", () => {
    const ref = [makeFile({ name: "notes.txt" })];
    const cmp = [makeFile({ name: "photo.png" })];
    const { matches, unmatched } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)).toBeNull();
    expect(unmatched).toHaveLength(1);
  });

  it("fuzzy-matches similar filenames with the same extension as possible", () => {
    const ref = [makeFile({ name: "user_profile.json" })];
    const cmp = [makeFile({ name: "user_proflie.json" })]; // typo
    const { matches } = matchAgainstReference(ref, cmp);
    expect(matches.get(ref[0].id)?.confidence).toBe("possible");
  });

  it("never assigns the same comparison file to two reference files", () => {
    const ref = [makeFile({ name: "a.txt" }), makeFile({ name: "a.txt", relativePath: "dup/a.txt" })];
    const cmp = [makeFile({ name: "a.txt" })];
    const { matches } = matchAgainstReference(ref, cmp);
    const claimedCount = ref.filter((r) => matches.get(r.id)?.file.id === cmp[0].id).length;
    expect(claimedCount).toBe(1);
  });
});

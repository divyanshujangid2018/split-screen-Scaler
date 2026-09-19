import { describe, expect, it } from "vitest";
import { normalizeFileName, baseNameWithoutExtension, similarity } from "@/lib/normalization";

describe("normalizeFileName", () => {
  it("lowercases and treats different cases as equal", () => {
    expect(normalizeFileName("Login.apk")).toBe(normalizeFileName("LOGIN.apk"));
  });

  it("strips a version suffix before the extension", () => {
    expect(normalizeFileName("Login_v2.apk")).toBe(normalizeFileName("Login.apk"));
  });

  it("strips duplicate-copy markers", () => {
    expect(normalizeFileName("report (1).pdf")).toBe(normalizeFileName("report.pdf"));
    expect(normalizeFileName("report - copy.pdf")).toBe(normalizeFileName("report.pdf"));
  });

  it("unifies separators", () => {
    expect(normalizeFileName("my file-name.txt")).toBe(normalizeFileName("my_file_name.txt"));
  });
});

describe("baseNameWithoutExtension", () => {
  it("drops the extension", () => {
    expect(baseNameWithoutExtension("settings.json")).toBe("settings");
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("is 0 when one side is empty", () => {
    expect(similarity("abc", "")).toBe(0);
  });

  it("decreases with edit distance", () => {
    expect(similarity("kitten", "sitting")).toBeLessThan(1);
    expect(similarity("kitten", "kitten2")).toBeGreaterThan(similarity("kitten", "sitting"));
  });
});

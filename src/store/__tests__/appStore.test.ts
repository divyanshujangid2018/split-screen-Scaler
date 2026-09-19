import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/appStore";
import { makeUser } from "@/test/helpers";

function seedUsers() {
  useAppStore.setState({
    users: [
      makeUser({ id: "ref", name: "Reference User", isReference: true, order: -1 }),
      makeUser({ id: "u2", name: "User 02", order: 0 }),
      makeUser({ id: "u3", name: "User 03", order: 1 }),
      makeUser({ id: "u4", name: "User 04", order: 2 }),
    ],
  });
}

describe("appStore user management", () => {
  beforeEach(() => {
    useAppStore.setState({ users: [], searchQuery: "", statusFilter: "all", fileHashes: {} });
    seedUsers();
  });

  it("removes a user", () => {
    useAppStore.getState().removeUser("u3");
    expect(useAppStore.getState().users.map((u) => u.id)).toEqual(["ref", "u2", "u4"]);
  });

  it("renames a user", () => {
    useAppStore.getState().renameUser("u2", "Renamed User");
    expect(useAppStore.getState().users.find((u) => u.id === "u2")?.name).toBe("Renamed User");
  });

  it("keeps exactly one reference user when switching reference", () => {
    useAppStore.getState().setReference("u3");
    const users = useAppStore.getState().users;
    const references = users.filter((u) => u.isReference);
    expect(references).toHaveLength(1);
    expect(references[0].id).toBe("u3");
    expect(users.find((u) => u.id === "ref")?.isReference).toBe(false);
  });

  it("reorders comparison users while leaving the reference untouched", () => {
    useAppStore.getState().reorderComparisonUsers(["u4", "u2", "u3"]);
    const users = useAppStore.getState().users;
    expect(users.find((u) => u.id === "ref")?.order).toBe(-1);
    const sorted = users.filter((u) => !u.isReference).sort((a, b) => a.order - b.order).map((u) => u.id);
    expect(sorted).toEqual(["u4", "u2", "u3"]);
  });

  it("updates a file's hash state independently of the users list", () => {
    useAppStore.getState().markHashing("file-1");
    expect(useAppStore.getState().fileHashes["file-1"].status).toBe("hashing");
    useAppStore.getState().updateFileHash("file-1", { hash: "abc123" });
    expect(useAppStore.getState().fileHashes["file-1"]).toEqual({ status: "done", hash: "abc123" });
  });
});

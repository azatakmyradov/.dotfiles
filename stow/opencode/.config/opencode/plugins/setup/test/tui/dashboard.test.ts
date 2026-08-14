import { describe, expect, test } from "bun:test";
import type { SubagentSnapshot } from "../../src/subagents/domain.ts";
import { orderSnapshots, stableSelection } from "../../src/subagents/tui/dashboard.tsx";

function snapshot(id: string, status: SubagentSnapshot["status"], createdAt: number) {
  return { id, status, createdAt } as SubagentSnapshot;
}

describe("subagent dashboard", () => {
  test("orders running entries first and newest entries next", () => {
    const items = [snapshot("old", "done", 1), snapshot("running", "running", 1), snapshot("new", "error", 3)];
    expect(orderSnapshots(items).map((item) => item.id)).toEqual(["running", "new", "old"]);
  });

  test("keeps a stable selection while the entry remains present", () => {
    const items = [snapshot("a", "done", 1), snapshot("b", "running", 2)];
    expect(stableSelection(items, "a")).toBe("a");
    expect(stableSelection(items, "missing")).toBe("a");
  });
});

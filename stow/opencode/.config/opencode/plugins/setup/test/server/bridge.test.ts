import { afterEach, describe, expect, test } from "bun:test";
import type { SubagentSnapshot } from "../../src/subagents/domain.ts";
import type { SubagentManagerShape } from "../../src/subagents/manager.ts";
import { createServerBridge } from "../../src/subagents/server/bridge.ts";
import { createBridgeClient, type BridgeClient } from "../../src/subagents/tui/bridge.ts";

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
});

async function eventually(check: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("bridge update timed out");
    await Bun.sleep(10);
  }
}

describe("authenticated server/TUI bridge", () => {
  test("syncs updates, routes controls, reconnects, and supports concurrent clients", async () => {
    let snapshots: ReadonlyArray<SubagentSnapshot> = [];
    const listeners = new Set<() => void>();
    const controls: string[] = [];
    const view = {
      list: () => snapshots,
      requestAbort: (id: string) => controls.push(`abort:${id}`),
      requestSend: (id: string, text: string) => controls.push(`steer:${id}:${text}`),
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const closeServer = await createServerBridge({ view } as unknown as SubagentManagerShape);
    cleanups.push(closeServer);

    const first = createBridgeClient();
    const second = createBridgeClient();
    cleanups.push(() => first.close(), () => second.close());
    snapshots = [{ id: "sa-test", title: "bridge" } as SubagentSnapshot];
    for (const listener of listeners) listener();
    await eventually(() => first.snapshots().some((item) => item.id === "sa-test") && second.snapshots().some((item) => item.id === "sa-test"));

    first.abort("sa-test");
    second.steer("sa-test", "continue");
    await eventually(() => controls.length === 2);
    expect(controls).toEqual(["abort:sa-test", "steer:sa-test:continue"]);

    first.close();
    const reloaded: BridgeClient = createBridgeClient();
    cleanups.push(() => reloaded.close());
    await eventually(() => reloaded.snapshots().some((item) => item.id === "sa-test"));
  });
});

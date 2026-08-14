import type { Context } from "@opencode-ai/plugin/effect/plugin";
import { Effect } from "effect";
import type { SubagentSnapshot } from "../domain.ts";
import { buildSubagentResultMessage } from "../prompt.ts";
import { createDeferredResultDelivery } from "../result-delivery.ts";

const MAX_RESULT_BYTES = 24 * 1024;

function boundedOutput(snapshot: SubagentSnapshot) {
  const output = snapshot.finalText || "(no output)";
  const bytes = Buffer.from(output);
  if (bytes.byteLength <= MAX_RESULT_BYTES) return output;
  return `${bytes.subarray(bytes.byteLength - MAX_RESULT_BYTES).toString("utf8")}\n\n[Output truncated. Open session ${snapshot.meta.openCodeSessionId ?? "?"} for the full transcript.]`;
}

export function createResultDelivery(ctx: Context) {
  const pending = new Map<string, ReturnType<typeof createDeferredResultDelivery<SubagentSnapshot>>>();
  const busy = new Set<string>();
  const flushing = new Set<string>();

  const queueFor = (sessionID: string) => {
    let queue = pending.get(sessionID);
    if (!queue) {
      queue = createDeferredResultDelivery<SubagentSnapshot>();
      pending.set(sessionID, queue);
    }
    return queue;
  };

  const flush = async (sessionID: string) => {
    if (busy.has(sessionID) || flushing.has(sessionID)) return;
    const results = queueFor(sessionID).drain();
    if (results.length === 0) return;
    flushing.add(sessionID);
    try {
      const text = results
        .map((snapshot) =>
          `${buildSubagentResultMessage({
            id: snapshot.id,
            title: snapshot.title,
            status: snapshot.status,
            errorText: snapshot.errorText,
            output: boundedOutput(snapshot),
          })}\nOpenCode session: ${snapshot.meta.openCodeSessionId ?? "?"}`,
        )
        .join("\n\n---\n\n");
      await Effect.runPromise(
        ctx.session.prompt({
          sessionID,
          text,
          delivery: "queue",
          metadata: { plugin: "opencode.subagents", kind: "result" },
        } as unknown as Parameters<typeof ctx.session.prompt>[0]),
      );
    } catch {
      for (const result of results) queueFor(sessionID).defer(result);
    } finally {
      flushing.delete(sessionID);
    }
  };

  return {
    settled(snapshot: SubagentSnapshot, consumed: boolean) {
      const queue = queueFor(snapshot.parentSessionID);
      if (consumed) queue.consume([snapshot.id]);
      else queue.defer({ ...snapshot, meta: { ...snapshot.meta } });
      if (!busy.has(snapshot.parentSessionID)) queueMicrotask(() => void flush(snapshot.parentSessionID));
    },
    consume(sessionID: string, ids: Iterable<string>) {
      queueFor(sessionID).consume(ids);
    },
    event(type: string, sessionID: string) {
      if (type === "session.execution.started") busy.add(sessionID);
      if (
        type === "session.execution.succeeded" ||
        type === "session.execution.failed" ||
        type === "session.execution.interrupted" ||
        type === "session.idle"
      ) {
        busy.delete(sessionID);
        queueMicrotask(() => void flush(sessionID));
      }
    },
    clear() {
      pending.clear();
      busy.clear();
    },
  };
}

export type ResultDelivery = ReturnType<typeof createResultDelivery>;

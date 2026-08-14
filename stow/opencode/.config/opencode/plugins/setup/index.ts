import { Plugin } from "@opencode-ai/plugin/effect";
import type { Context } from "@opencode-ai/plugin/effect/plugin";
import { Effect, Stream } from "effect";
import { claudeBackend } from "./src/subagents/backends/claude.ts";
import { codexBackend } from "./src/subagents/backends/codex.ts";
import { SubagentManager } from "./src/subagents/manager.ts";
import { createSubagentRuntime } from "./src/subagents/runtime.ts";
import { createServerBridge } from "./src/subagents/server/bridge.ts";
import { createResultDelivery } from "./src/subagents/server/delivery.ts";
import { withShadowSession } from "./src/subagents/server/shadow.ts";
import { registerSubagentTools } from "./src/subagents/server/tools.ts";

function configureSubagent(ctx: Context) {
  return Effect.gen(function* () {
    yield* ctx.session.hook("context", (event) =>
      Effect.sync(() => {
        if (event.agent !== "subagent") return;

        for (const name of Object.keys(event.tools)) {
          if (name.startsWith("subagent_")) delete event.tools[name];
        }
      }),
    );

    yield* ctx.agent.transform((agents) => {
      agents.update("subagent", (agent) => {
        agent.mode = "subagent";
        agent.hidden = false;
        agent.description = "Autonomous child session without recursive subagent tools";
      });
    });
  });
}

function monitorSessions(
  ctx: Context,
  delivery: ReturnType<typeof createResultDelivery>,
  cancelWaits: (sessionID: string) => void,
) {
  return ctx.event.subscribe().pipe(
    Stream.runForEach((event) =>
      Effect.sync(() => {
        if (!("data" in event) || !("sessionID" in event.data)) return;

        const sessionID = event.data.sessionID;
        delivery.event(event.type, sessionID);

        if (
          event.type === "session.execution.interrupted" ||
          event.type === "session.execution.failed"
        ) {
          cancelWaits(sessionID);
        }
      }),
    ),
    Effect.forkScoped,
  );
}

export default Plugin.define({
  id: "opencode.subagents.server",
  effect: (ctx) =>
    Effect.gen(function* () {
      const runtime = createSubagentRuntime([
        withShadowSession(ctx, claudeBackend),
        withShadowSession(ctx, codexBackend),
      ]);
      yield* Effect.addFinalizer(() => Effect.promise(() => runtime.dispose()));

      const manager = yield* Effect.promise(() => runtime.runPromise(SubagentManager));
      const delivery = createResultDelivery(ctx);
      manager.view.setOnSettled((snapshot, consumed) => delivery.settled(snapshot, consumed));
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          manager.view.setOnSettled(undefined);
          delivery.clear();
        }),
      );

      const tools = yield* registerSubagentTools(ctx, runtime, manager, delivery);
      const closeBridge = yield* Effect.promise(() => createServerBridge(manager));
      yield* Effect.addFinalizer(() => Effect.promise(closeBridge));

      yield* configureSubagent(ctx);
      yield* monitorSessions(ctx, delivery, tools.cancelWaits);
    }),
});

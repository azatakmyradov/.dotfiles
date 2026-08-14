import type { Context } from "@opencode-ai/plugin/effect/plugin";
import { Effect, Stream } from "effect";
import type { SubagentBackend, SubagentSession } from "../backend.ts";
import type { SubagentMeta } from "../domain.ts";
import { SpawnError } from "../domain.ts";

export function withShadowSession(
  ctx: Context,
  backend: SubagentBackend,
): SubagentBackend {
  return {
    ...backend,
    spawn: (task) =>
      Effect.gen(function* () {
        const native = yield* backend.spawn(task);
        const shadow = yield* ctx.session
          .create({
            title: `[${backend.name} subagent] ${task.title}`,
            location: { directory: task.cwd },
          } as Parameters<typeof ctx.session.create>[0])
          .pipe(Effect.mapError((error) => new SpawnError({ message: String(error) })));
        const patch: Partial<SubagentMeta> = {
          openCodeSessionId: shadow.id,
        };
        return {
          ...native,
          meta: native.meta.pipe(Effect.map((meta) => ({ ...meta, ...patch }))),
          events: Stream.concat(
            Stream.make({ _tag: "MetaChanged", meta: patch } as const),
            native.events,
          ),
        } satisfies SubagentSession;
      }),
  };
}

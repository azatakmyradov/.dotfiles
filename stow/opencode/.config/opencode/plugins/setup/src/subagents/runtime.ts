/**
 * Layer composition and the async entry-point boundary.
 *
 * Everything inside the extension is Effect generators; this module is where
 * tool handlers (plain async functions) run those effects against one shared
 * ManagedRuntime.
 */

import { Cause, Exit, Layer, ManagedRuntime, type Effect } from "effect";
import { BackendRegistry, type SubagentBackend } from "./backend.ts";
import { claudeBackend } from "./backends/claude.ts";
import { codexBackend } from "./backends/codex.ts";
import type { BackendName } from "./domain.ts";
import { SubagentManagerLive } from "./manager.ts";

export function createSubagentRuntime(
  externalBackends: ReadonlyArray<SubagentBackend> = [claudeBackend, codexBackend],
) {
  const BackendRegistryLive = Layer.sync(BackendRegistry, () => {
    return new Map<BackendName, SubagentBackend>(
      externalBackends.map((backend) => [backend.name, backend]),
    );
  });

  const AppLayer = SubagentManagerLive.pipe(Layer.provide(BackendRegistryLive));
  return ManagedRuntime.make(AppLayer);
}

export type SubagentRuntime = ReturnType<typeof createSubagentRuntime>;

/**
 * Run an effect from an async tool handler. Typed failures and defects are
 * converted to thrown Errors for the plugin tool contract; interruption
 * (tool AbortSignal) throws `interruptMessage`.
 */
export async function runTool<A, E>(
  runtime: SubagentRuntime,
  effect: Effect.Effect<A, E>,
  options: { signal?: AbortSignal; interruptMessage?: string } = {},
) {
  const exit = await runtime.runPromiseExit(
    effect,
    options.signal ? { signal: options.signal } : undefined,
  );
  if (Exit.isSuccess(exit)) return exit.value;
  if (Cause.hasInterruptsOnly(exit.cause)) {
    throw new Error(options.interruptMessage ?? "Operation was aborted.");
  }
  const [first] = Cause.prettyErrors(exit.cause);
  throw new Error(first?.message ?? Cause.pretty(exit.cause));
}

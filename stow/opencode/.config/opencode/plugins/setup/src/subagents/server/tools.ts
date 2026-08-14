import * as fs from "node:fs";
import * as path from "node:path";
import type { Context } from "@opencode-ai/plugin/effect/plugin";
import { Tool } from "@opencode-ai/schema/tool";
import { Effect } from "effect";
import type { SubagentManagerShape } from "../manager.ts";
import {
  BACKEND_NAMES,
  formatElapsed,
  latestText,
  REASONING_EFFORTS,
  type BackendName,
  type ReasoningEffort,
  type SubagentSnapshot,
} from "../domain.ts";
import { formatContextUtilization } from "../format.ts";
import {
  buildSubagentSpawnResult,
  SUBAGENT_CANCEL_TOOL_DESCRIPTION,
  SUBAGENT_CHECK_TOOL_DESCRIPTION,
  SUBAGENT_LIST_TOOL_DESCRIPTION,
  SUBAGENT_SPAWN_TOOL_DESCRIPTION,
  SUBAGENT_WAIT_TOOL_DESCRIPTION,
} from "../prompt.ts";
import { runTool, type SubagentRuntime } from "../runtime.ts";
import type { ResultDelivery } from "./delivery.ts";

const idsSchema = {
  type: "object",
  properties: { ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 64 } },
  required: ["ids"],
  additionalProperties: false,
} as const;

const toolError = (error: unknown) =>
  error instanceof Tool.Error
    ? error
    : new Tool.Error({
        message: error instanceof Error ? error.message : String(error),
        error,
      });

function describe(snapshot: SubagentSnapshot) {
  const details = [
    `${snapshot.backend}: ${snapshot.meta.modelLabel ?? "?"}`,
    formatContextUtilization(snapshot.usage),
    formatElapsed(snapshot),
    snapshot.cwd,
  ].filter(Boolean);
  return `${snapshot.id} [${snapshot.status}] "${snapshot.title}" (${details.join(", ")}) session=${snapshot.meta.openCodeSessionId ?? "?"}`;
}

function truncate(text: string, maxBytes: number) {
  const bytes = Buffer.from(text);
  if (bytes.byteLength <= maxBytes) return text;
  return `${bytes.subarray(bytes.byteLength - maxBytes).toString("utf8")}\n[truncated]`;
}

export function registerSubagentTools(
  ctx: Context,
  runtime: SubagentRuntime,
  manager: SubagentManagerShape,
  delivery: ResultDelivery,
) {
  const waits = new Map<string, Set<AbortController>>();
  const waitController = (sessionID: string) => {
    const controller = new AbortController();
    let set = waits.get(sessionID);
    if (!set) waits.set(sessionID, (set = new Set()));
    set.add(controller);
    return controller;
  };
  const releaseWait = (sessionID: string, controller: AbortController) => {
    const set = waits.get(sessionID);
    set?.delete(controller);
    if (set?.size === 0) waits.delete(sessionID);
  };

  return Effect.gen(function* () {
    yield* ctx.tool.transform((tools) => {
      tools.add({
        name: "subagent_spawn",
        description: SUBAGENT_SPAWN_TOOL_DESCRIPTION,
        input: {
          type: "object",
          properties: {
            prompt: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1, maxLength: 160 },
            harness: { type: "string", enum: [...BACKEND_NAMES] },
            working_dir: { type: "string" },
            model: { type: "string" },
            reasoning_effort: { type: "string", enum: [...REASONING_EFFORTS] },
          },
          required: ["prompt", "name", "harness"],
          additionalProperties: false,
        } as const,
        options: { codemode: false },
        execute: (raw, tool) =>
          Effect.gen(function* () {
            const input = raw as {
              prompt: string;
              name: string;
              harness: BackendName;
              working_dir?: string;
              model?: string;
              reasoning_effort?: ReasoningEffort;
            };
            const parent = yield* ctx.session.get({ sessionID: tool.sessionID });
            const cwd = path.resolve(parent.location.directory, input.working_dir ?? ".");
            if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
              return yield* Effect.fail(
                toolError(new Error(`working_dir is not a directory: ${cwd}`)),
              );
            }
            const snapshot = yield* manager.spawn(input.harness, {
              prompt: input.prompt,
              title: input.name.trim().slice(0, 160) || "subagent",
              cwd,
              model: input.model,
              reasoningEffort: input.reasoning_effort,
              parent: {
                parentSessionID: tool.sessionID,
              },
            });
            return { content: buildSubagentSpawnResult({ id: snapshot.id, title: snapshot.title, harness: snapshot.backend, modelLabel: snapshot.meta.modelLabel ?? "?", cwd }), metadata: { id: snapshot.id, sessionID: snapshot.meta.openCodeSessionId } };
          }).pipe(Effect.mapError(toolError)),
      });

      tools.add({
      name: "subagent_wait",
      description: SUBAGENT_WAIT_TOOL_DESCRIPTION,
      input: idsSchema,
      options: { codemode: false },
      execute: (raw, tool) => Effect.tryPromise({
        try: async () => {
        const { ids } = raw as { ids: string[] };
        const unique = [...new Set(ids)];
        const unknown = unique.filter((id) => manager.view.get(id)?.parentSessionID !== tool.sessionID);
        if (unknown.length) throw new Error(`Unknown subagent id(s): ${unknown.join(", ")}`);
        const controller = waitController(tool.sessionID);
        try {
          await runTool(runtime, manager.waitFor(unique, (pending) => {
            Effect.runFork(tool.progress({ pending }));
          }), {
            signal: controller.signal,
            interruptMessage: "Wait aborted. Subagents keep running.",
          });
        } finally {
          releaseWait(tool.sessionID, controller);
        }
        delivery.consume(tool.sessionID, unique);
        return {
          content: truncate(unique.map((id) => {
            const snapshot = manager.view.get(id)!;
            return `## ${snapshot.id} "${snapshot.title}" [${snapshot.status}]\n${snapshot.errorText ? `Error: ${snapshot.errorText}\n` : ""}\n${truncate(snapshot.finalText || "(no output)", 16 * 1024)}`;
          }).join("\n\n---\n\n"), 48 * 1024),
        };
        },
        catch: toolError,
      }),
      });

      tools.add({
      name: "subagent_cancel",
      description: SUBAGENT_CANCEL_TOOL_DESCRIPTION,
      input: idsSchema,
      options: { codemode: false },
      execute: (raw, tool) => Effect.tryPromise({
        try: async () => {
        const { ids } = raw as { ids: string[] };
        const unique = [...new Set(ids)];
        const unknown = unique.filter((id) => manager.view.get(id)?.parentSessionID !== tool.sessionID);
        if (unknown.length) throw new Error(`Unknown subagent id(s): ${unknown.join(", ")}`);
        const result = await runTool(runtime, manager.cancel(unique));
        delivery.consume(tool.sessionID, unique);
        return { content: result.map((item) => item.cancelled ? `Cancelled ${item.id} "${item.title}".` : `${item.id} was already ${item.status}.`).join("\n") };
        },
        catch: toolError,
      }),
      });

      tools.add({
      name: "subagent_check",
      description: SUBAGENT_CHECK_TOOL_DESCRIPTION,
      input: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false } as const,
      options: { codemode: false },
      execute: (raw, tool) =>
        Effect.try({
          try: () => {
            const { id } = raw as { id: string };
            const snapshot = manager.view.get(id);
            if (!snapshot || snapshot.parentSessionID !== tool.sessionID) {
              throw new Error(`Unknown subagent id "${id}".`);
            }
            const output = latestText(snapshot);
            return { content: `${describe(snapshot)}\nTurns: ${snapshot.turns}${snapshot.errorText ? `\nError: ${snapshot.errorText}` : ""}${output ? `\n\nLatest output:\n${truncate(output, 2048)}` : ""}` };
          },
          catch: toolError,
        }),
      });

      tools.add({
      name: "subagent_list",
      description: SUBAGENT_LIST_TOOL_DESCRIPTION,
      input: { type: "object", properties: {}, additionalProperties: false } as const,
      options: { codemode: false },
      execute: (_input, tool) => Effect.sync(() => {
        const list = manager.view.list().filter((snapshot) => snapshot.parentSessionID === tool.sessionID);
        return { content: list.length ? list.map(describe).join("\n") : "No subagents." };
      }),
      });
    });

    return {
      cancelWaits(sessionID: string) {
        for (const controller of waits.get(sessionID) ?? []) controller.abort();
      },
    };
  });
}

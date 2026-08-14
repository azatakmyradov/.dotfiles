import type { SubagentSnapshot } from "./domain.ts";

export const BRIDGE_VERSION = 1;
export const BRIDGE_DIRECTORY = `/tmp/opencode-subagents-${process.getuid?.() ?? "user"}`;

export interface BridgeManifest {
  readonly version: typeof BRIDGE_VERSION;
  readonly socket: string;
  readonly token: string;
  readonly pid: number;
  readonly startedAt: number;
}

export type ClientMessage =
  | { readonly type: "auth"; readonly token: string }
  | { readonly type: "steer"; readonly id: string; readonly text: string }
  | { readonly type: "abort"; readonly id: string };

export type ServerMessage =
  | { readonly type: "state"; readonly snapshots: ReadonlyArray<SubagentSnapshot> }
  | { readonly type: "error"; readonly message: string };

export function encodeMessage(message: ClientMessage | ServerMessage) {
  return `${JSON.stringify(message)}\n`;
}

export function parseLines(
  chunk: string,
  buffer: string,
  receive: (value: unknown) => void,
) {
  buffer += chunk;
  while (true) {
    const index = buffer.indexOf("\n");
    if (index < 0) return buffer.slice(-1024 * 1024);
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    try {
      receive(JSON.parse(line));
    } catch {
      // Ignore malformed client frames without taking down the bridge.
    }
  }
}

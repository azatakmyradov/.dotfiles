import { describe, expect, test } from "bun:test";
import { encodeMessage, parseLines } from "../../src/subagents/protocol.ts";

describe("server/TUI bridge protocol", () => {
  test("handles split and concurrent frames", () => {
    const received: unknown[] = [];
    let buffer = parseLines('{"type":"ab', "", (value) => received.push(value));
    buffer = parseLines('ort","id":"sa-1"}\n' + encodeMessage({ type: "steer", id: "sa-2", text: "continue" }), buffer, (value) => received.push(value));
    expect(buffer).toBe("");
    expect(received).toEqual([
      { type: "abort", id: "sa-1" },
      { type: "steer", id: "sa-2", text: "continue" },
    ]);
  });
});

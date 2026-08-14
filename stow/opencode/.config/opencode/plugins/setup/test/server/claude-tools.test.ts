import assert from "node:assert/strict";
import test from "node:test";
import { claudeToolPolicy, claudeTools } from "../../src/subagents/backends/claude.ts";

test("Claude tool allowlists translate OpenCode tool names", () => {
  assert.deepEqual(claudeTools(["read", "grep", "glob", "shell"]), [
    "Read",
    "Grep",
    "Glob",
    "Bash",
  ]);
});

test("Claude tool allowlists preserve backend-native and unknown names", () => {
  assert.deepEqual(claudeTools(["Read", "custom_tool", "read"]), [
    "Read",
    "custom_tool",
  ]);
});

test("Claude tool policies isolate the allowlist from settings and MCP tools", () => {
  assert.deepEqual(claudeToolPolicy(["read", "grep"], "/repo"), {
    tools: ["Read", "Grep"],
    strictMcpConfig: true,
    mcpServers: {},
    settingSources: [],
    settings: { disableAllHooks: true },
    sandbox: {
      enabled: true,
      failIfUnavailable: true,
      allowUnsandboxedCommands: false,
      filesystem: { denyWrite: ["/repo"] },
    },
  });
});

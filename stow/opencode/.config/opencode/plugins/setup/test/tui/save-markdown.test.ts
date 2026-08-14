import { describe, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionMessageInfo } from "@opencode-ai/client";
import type {
  Context,
  KeymapCommand,
  SlotClaim,
} from "@opencode-ai/plugin/tui/context";
import { latestAssistantMarkdown, setupSaveMarkdown } from "../../src/save-markdown.ts";

const assistantMessage = (
  text: string,
  created: number,
): SessionMessageInfo => ({
  id: `msg_${created}`,
  type: "assistant",
  agent: "plan",
  model: { providerID: "anthropic", id: "claude" },
  content: [{ type: "text", text }],
  time: { created, completed: created + 1 },
});

function makeHarness(
  directory: string,
  options?: {
    route?: "session" | "home";
    messages?: SessionMessageInfo[];
  },
) {
  let command: KeymapCommand | undefined;
  const toast = mock(() => {});
  const sync = mock(async () => {});
  const messages = options?.messages ?? [assistantMessage("# Saved", 1)];
  const context = {
    ui: {
      slot: (claim: SlotClaim) => {
        if (claim.append !== "session.composer.top") {
          throw new Error("Expected session composer slot");
        }
        claim.render({ sessionID: "ses_1" });
        return () => {};
      },
      router: {
        current: () =>
          options?.route === "home"
            ? { type: "home" as const }
            : { type: "session" as const, sessionID: "ses_1" },
      },
      toast: { show: toast },
    },
    keymap: {
      layer: (factory: () => { commands?: readonly KeymapCommand[] }) => {
        command = factory().commands?.[0];
      },
    },
    data: {
      session: {
        get: () => ({ location: { directory } }),
        message: { sync, list: () => messages },
      },
    },
  } as unknown as Context;

  setupSaveMarkdown(context);
  return {
    command: () => command,
    run: (input?: string) => command?.run(input) as Promise<void>,
    sync,
    toast,
  };
}

describe("latestAssistantMarkdown", () => {
  test("returns the newest assistant text verbatim without reasoning", () => {
    const older = assistantMessage("older", 1);
    const latest = assistantMessage("first  \n", 3);
    if (latest.type !== "assistant") throw new Error("Expected assistant message");
    latest.content = [
      { type: "text", text: "first  \n" },
      { type: "reasoning", text: "private reasoning" },
      { type: "text", text: "second" },
    ];

    expect(latestAssistantMarkdown([latest, older])).toBe("first  \n\n\nsecond");
  });
});

describe("/save-md", () => {
  test("registers globally with argument support", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opencode-save-md-"));
    try {
      const harness = makeHarness(directory);

      expect(harness.command()?.id).toBe("save-md");
      expect(harness.command()?.slash).toEqual({ name: "save-md", arguments: true });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("saves Markdown in the session directory and adds the suffix", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opencode-save-md-"));
    const markdown = "# Design\n\n- Preserve **Markdown**";
    try {
      const harness = makeHarness(directory, { messages: [assistantMessage(markdown, 1)] });

      await harness.run("design");

      const path = join(directory, "design.md");
      expect(await readFile(path, "utf8")).toBe(`${markdown}\n`);
      expect(harness.sync).toHaveBeenCalledWith("ses_1");
      expect(harness.toast).toHaveBeenCalledWith({
        message: `Saved Markdown to ${path}`,
        variant: "success",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("preserves trailing Markdown and an explicit suffix", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opencode-save-md-"));
    const markdown = "Paragraph with trailing space  \n\n";
    try {
      const harness = makeHarness(directory, { messages: [assistantMessage(markdown, 1)] });

      await harness.run("verbatim.md");

      expect(await readFile(join(directory, "verbatim.md"), "utf8")).toBe(markdown);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("refuses to overwrite an existing file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opencode-save-md-"));
    const path = join(directory, "answer.md");
    try {
      await writeFile(path, "existing\n", "utf8");
      const harness = makeHarness(directory);

      await harness.run("answer");

      expect(await readFile(path, "utf8")).toBe("existing\n");
      expect(harness.toast).toHaveBeenCalledWith({
        message: `File already exists: ${path}`,
        variant: "error",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("validates the route, name, and response", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opencode-save-md-"));
    try {
      const home = makeHarness(directory, { route: "home" });
      await home.run("answer");
      expect(home.toast).toHaveBeenCalledWith({
        message: "/save-md must be run from a session",
        variant: "warning",
      });

      const missingName = makeHarness(directory);
      await missingName.run("  ");
      expect(missingName.toast).toHaveBeenCalledWith({
        message: "Usage: /save-md name",
        variant: "warning",
      });

      const missingResponse = makeHarness(directory, { messages: [] });
      await missingResponse.run("answer");
      expect(missingResponse.toast).toHaveBeenCalledWith({
        message: "No assistant response to save",
        variant: "warning",
      });

      const emptyResponse = makeHarness(directory, {
        messages: [assistantMessage("   ", 1)],
      });
      await emptyResponse.run("answer");
      expect(emptyResponse.toast).toHaveBeenCalledWith({
        message: "The latest assistant response has no Markdown text",
        variant: "warning",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

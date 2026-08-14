import { describe, expect, mock, test } from "bun:test";
import type {
  Context,
  KeymapCommand,
  KeymapLayer,
  SlotClaim,
} from "@opencode-ai/plugin/tui/context";
import type { SessionMessageInfo } from "@opencode-ai/client";
import { findLatestAssistantMessage, setupImplement } from "./tui";

const userMessage = (text: string, created: number): SessionMessageInfo => ({
  id: `msg_${created}`,
  type: "user",
  text,
  time: { created },
});

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

function makeContext(options?: {
  tabsOpen?: boolean;
  messages?: SessionMessageInfo[];
  promptError?: Error;
}) {
  let command: KeymapCommand | undefined;
  let layer: KeymapLayer | undefined;
  let slot: string | undefined;
  const create = mock(async () => ({ id: "ses_new" }));
  const prompt = mock(async () => {
    if (options?.promptError) throw options.promptError;
    return {};
  });
  const navigate = mock(() => {});
  const toast = mock(() => {});
  const sync = mock(async () => {});
  const messages = options?.messages ?? [
    userMessage("Plan this", 1),
    assistantMessage("Implement this plan", 2),
  ];

  const context = {
    keymap: {
      layer: (factory: () => KeymapLayer) => {
        layer = factory();
        command = layer.commands?.[0];
      },
    },
    ui: {
      slot: (claim: SlotClaim) => {
        if (claim.append !== "session.composer.top") {
          throw new Error("Expected session composer slot");
        }
        slot = claim.append;
        claim.render({ sessionID: "ses_source" });
        return () => {};
      },
      router: {
        current: () => ({ type: "session", sessionID: "ses_source" }),
        navigate,
      },
      tabs: { open: mock(() => options?.tabsOpen ?? true) },
      toast: { show: toast },
    },
    data: {
      session: {
        get: () => ({
          id: "ses_source",
          location: { directory: "/project", workspaceID: "wrk_1" },
          model: { providerID: "anthropic", id: "claude" },
        }),
        message: { sync, list: () => messages },
      },
    },
    client: { session: { create, prompt } },
  } as unknown as Context;

  setupImplement(context);

  return {
    run: async () => command?.run(),
    create,
    prompt,
    navigate,
    toast,
    sync,
    mode: () => layer?.mode,
    slot: () => slot,
    command: () => command,
  };
}

describe("findLatestAssistantMessage", () => {
  test("finds the newest non-empty assistant response", () => {
    const messages = [
      assistantMessage("newest", 3),
      assistantMessage("older", 1),
      userMessage("newest user message", 4),
      assistantMessage("  ", 5),
    ] satisfies SessionMessageInfo[];

    expect(findLatestAssistantMessage(messages)?.text).toBe("newest");
  });

  test("combines text parts without reasoning or tool content", () => {
    const message = assistantMessage("first", 1);
    if (message.type !== "assistant") throw new Error("Expected assistant");
    message.content = [
      { type: "text", text: "first" },
      { type: "reasoning", text: "private reasoning" },
      { type: "text", text: "second" },
    ];

    expect(findLatestAssistantMessage([message])?.text).toBe("first\n\nsecond");
  });
});

describe("/implement", () => {
  test("creates, opens, and prompts a build session", async () => {
    const harness = makeContext();

    await harness.run();

    expect(harness.slot()).toBe("session.composer.top");
    expect(harness.mode()).toBe("global");
    expect(harness.command()?.slash).toEqual({ name: "implement" });
    expect(harness.command()?.enabled).toBeUndefined();
    expect(harness.sync).toHaveBeenCalledWith("ses_source");
    expect(harness.create).toHaveBeenCalledWith({
      agent: "build",
      location: { directory: "/project", workspaceID: "wrk_1" },
      model: { providerID: "anthropic", id: "claude" },
    });
    expect(harness.prompt).toHaveBeenCalledWith({
      sessionID: "ses_new",
      text: "Implement this plan",
    });
    expect(harness.navigate).not.toHaveBeenCalled();
  });

  test("navigates to the new session when tabs are disabled", async () => {
    const harness = makeContext({ tabsOpen: false });

    await harness.run();

    expect(harness.navigate).toHaveBeenCalledWith({
      type: "session",
      sessionID: "ses_new",
    });
  });

  test("does not create a session without an assistant response", async () => {
    const harness = makeContext({ messages: [] });

    await harness.run();

    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "No assistant response found to implement",
      variant: "warning",
    });
  });

  test("reports prompt failures", async () => {
    const harness = makeContext({
      promptError: new Error("provider unavailable"),
    });

    await harness.run();

    expect(harness.toast).toHaveBeenCalledWith({
      message: "Could not start implementation: provider unavailable",
      variant: "error",
    });
  });
});

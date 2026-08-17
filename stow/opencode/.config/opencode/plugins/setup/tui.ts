import * as Plugin from "@opencode-ai/plugin/tui/plugin";
import type {
  SessionMessageAssistant,
  SessionMessageInfo,
} from "@opencode-ai/client";
import type { Context } from "@opencode-ai/plugin/tui/context";
import { createComponent } from "solid-js";
import type { SubagentSnapshot } from "./src/subagents/domain.ts";
import { createBridgeClient } from "./src/subagents/tui/bridge.ts";
import { formatElapsed } from "./src/subagents/domain.ts";
import { formatContextUtilization } from "./src/subagents/format.ts";
import { orderSnapshots } from "./src/subagents/tui/dashboard.tsx";
import { Detail } from "./src/subagents/tui/detail.tsx";
import { Status } from "./src/subagents/tui/status.tsx";
import { setupCommit } from "./src/git/commit.ts";
import { setupSaveMarkdown } from "./src/save-markdown.ts";

export { setupCommit } from "./src/git/commit.ts";
export { setupSaveMarkdown } from "./src/save-markdown.ts";

export function findLatestAssistantMessage(
  messages: readonly SessionMessageInfo[],
): { message: SessionMessageAssistant; text: string } | undefined {
  let latest: { message: SessionMessageAssistant; text: string } | undefined;

  for (const message of messages) {
    if (message.type !== "assistant") continue;

    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join("\n\n");
    if (!text) continue;

    if (!latest || message.time.created >= latest.message.time.created) {
      latest = { message, text };
    }
  }

  return latest;
}

export function setupImplement(ctx: Context) {
  let starting = false;

  return ctx.ui.slot({
    append: "session.composer.top",
    render: () => {
      ctx.keymap.layer(() => ({
        mode: "global",
        commands: [
          {
            id: "implement",
            title: "Implement last response",
            description:
              "Implement the latest assistant response in a new session tab",
            slash: { name: "implement" },
            run: async () => {
              if (starting) return;

              const route = ctx.ui.router.current();
              if (route.type !== "session") {
                ctx.ui.toast.show({
                  message: "/implement must be run from a session",
                  variant: "warning",
                });
                return;
              }

              starting = true;
              try {
                await ctx.data.session.message.sync(route.sessionID);

                const response = findLatestAssistantMessage(
                  ctx.data.session.message.list(route.sessionID),
                );
                if (!response) {
                  ctx.ui.toast.show({
                    message: "No assistant response found to implement",
                    variant: "warning",
                  });
                  return;
                }

                const source = ctx.data.session.get(route.sessionID);
                if (!source) throw new Error("Current session is unavailable");

                const session = await ctx.client.session.create({
                  agent: "build",
                  location: source.location,
                  model: source.model,
                });

                if (!ctx.ui.tabs.open(session.id)) {
                  ctx.ui.router.navigate({
                    type: "session",
                    sessionID: session.id,
                  });
                }

                await ctx.client.session.prompt({
                  sessionID: session.id,
                  text: response.text,
                });
              } catch (error) {
                ctx.ui.toast.show({
                  message:
                    error instanceof Error
                      ? `Could not start implementation: ${error.message}`
                      : "Could not start implementation",
                  variant: "error",
                });
              } finally {
                starting = false;
              }
            },
          },
        ],
      }));

      return null;
    },
  });
}

export default Plugin.define({
  id: "opencode.subagents.tui",
  setup: (ctx) => {
    const disposeImplement = setupImplement(ctx);
    const disposeCommit = setupCommit(ctx);
    const disposeSaveMarkdown = setupSaveMarkdown(ctx);
    const bridge = createBridgeClient();
    let parentSessionID: string | undefined;
    const drafts = new Map<string, string>();
    const backFromDashboard = () => {
      ctx.ui.router.navigate(
        parentSessionID
          ? { type: "session", sessionID: parentSessionID }
          : { type: "home" },
      );
    };
    const scopedSnapshots = () => {
      return parentSessionID
        ? bridge
            .snapshots()
            .filter((item) => item.parentSessionID === parentSessionID)
        : [];
    };
    const openSnapshot = (snapshot: SubagentSnapshot) => {
      ctx.ui.router.navigate({
        type: "plugin",
        name: "subagent-detail",
        data: { id: snapshot.id },
      });
    };
    const open = async () => {
      const route = ctx.ui.router.current();
      if (route.type !== "session") {
        ctx.ui.toast.show({
          message: "/subagents must be run from a session",
          variant: "warning",
        });
        return;
      }
      parentSessionID = route.sessionID;
      if (!bridge.ready()) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            stop();
            resolve();
          }, 500);
          const stop = bridge.subscribe(() => {
            if (!bridge.ready()) return;
            clearTimeout(timeout);
            stop();
            resolve();
          });
        });
      }
      const items = orderSnapshots(scopedSnapshots());
      if (items.length === 0) {
        ctx.ui.toast.show({
          message: "No subagents for this session",
          variant: "info",
        });
        return;
      }
      const id = await ctx.ui.dialog.select({
        title: "Subagents",
        placeholder: "Select a subagent to open",
        options: items.map((snapshot) => ({
          title: `${snapshot.status === "running" ? ">" : snapshot.status === "done" ? "+" : "!"} ${snapshot.id} ${snapshot.title}`,
          value: snapshot.id,
          description: `${snapshot.backend} | ${snapshot.meta.modelLabel ?? "?"} | ${formatContextUtilization(snapshot.usage) || "? context"} | ${formatElapsed(snapshot)}`,
        })),
      });
      const snapshot = items.find((item) => item.id === id);
      if (snapshot) openSnapshot(snapshot);
    };
    const unregisterDetail = ctx.ui.router.register({
      name: "subagent-detail",
      render: ({ data }) => createComponent(Detail, {
        ctx,
        bridge,
        snapshots: scopedSnapshots,
        id: String(data?.id ?? ""),
        back: backFromDashboard,
        draft: () => drafts.get(String(data?.id ?? "")) ?? "",
        setDraft: (text) => drafts.set(String(data?.id ?? ""), text),
      }),
    });
    const disposeStatus = ctx.ui.slot({
      append: "prompt.footer.status",
      render: (input) => createComponent(Status, {
        ctx,
        bridge,
        sessionID: input.sessionID,
        open,
      }),
    });

    return () => {
      disposeImplement();
      disposeCommit();
      disposeSaveMarkdown();
      disposeStatus();
      unregisterDetail();
      bridge.close();
    };
  },
});

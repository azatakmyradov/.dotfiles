import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SessionMessageInfo } from "@opencode-ai/client";
import type { Context } from "@opencode-ai/plugin/tui/context";

export function latestAssistantMarkdown(
  messages: readonly SessionMessageInfo[],
): string | undefined {
  let latest: Extract<SessionMessageInfo, { type: "assistant" }> | undefined;

  for (const message of messages) {
    if (message.type !== "assistant") continue;
    if (!latest || message.time.created >= latest.time.created) latest = message;
  }

  if (!latest) return undefined;
  return latest.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}

export function setupSaveMarkdown(ctx: Context) {
  return ctx.ui.slot({
    append: "session.composer.top",
    render: () => {
      ctx.keymap.layer(() => ({
        mode: "global",
        commands: [
          {
            id: "save-md",
            title: "Save response as Markdown",
            description: "Save the latest assistant response as a Markdown file",
            slash: { name: "save-md", arguments: true },
            run: async (input) => {
              const route = ctx.ui.router.current();
              if (route.type !== "session") {
                ctx.ui.toast.show({
                  message: "/save-md must be run from a session",
                  variant: "warning",
                });
                return;
              }

              const name = input?.trim();
              if (!name) {
                ctx.ui.toast.show({ message: "Usage: /save-md name", variant: "warning" });
                return;
              }

              const session = ctx.data.session.get(route.sessionID);
              if (!session) {
                ctx.ui.toast.show({ message: "Current session is unavailable", variant: "error" });
                return;
              }

              try {
                await ctx.data.session.message.sync(route.sessionID);
                const markdown = latestAssistantMarkdown(
                  ctx.data.session.message.list(route.sessionID),
                );
                if (markdown === undefined) {
                  ctx.ui.toast.show({
                    message: "No assistant response to save",
                    variant: "warning",
                  });
                  return;
                }
                if (!markdown.trim()) {
                  ctx.ui.toast.show({
                    message: "The latest assistant response has no Markdown text",
                    variant: "warning",
                  });
                  return;
                }

                const fileName = name.endsWith(".md") ? name : `${name}.md`;
                const path = resolve(session.location.directory, fileName);
                try {
                  await writeFile(path, markdown.endsWith("\n") ? markdown : `${markdown}\n`, {
                    encoding: "utf8",
                    flag: "wx",
                  });
                } catch (error) {
                  if (
                    typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    error.code === "EEXIST"
                  ) {
                    ctx.ui.toast.show({ message: `File already exists: ${path}`, variant: "error" });
                    return;
                  }
                  throw error;
                }

                ctx.ui.toast.show({ message: `Saved Markdown to ${path}`, variant: "success" });
              } catch (error) {
                ctx.ui.toast.show({
                  message:
                    error instanceof Error
                      ? `Could not save Markdown: ${error.message}`
                      : "Could not save Markdown",
                  variant: "error",
                });
              }
            },
          },
        ],
      }));

      return null;
    },
  });
}

import type {
  InputRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { bold, dim, fg, StyledText, type TextChunk } from "@opentui/core";
import type { Context } from "@opencode-ai/plugin/tui/context";
import { formatElapsed, type SubagentSnapshot } from "../domain.ts";
import { formatContextUtilization } from "../format.ts";
import type { BridgeClient } from "./bridge.ts";

function transcriptText(
  snapshot: SubagentSnapshot | undefined,
  theme: Context["theme"],
) {
  const chunks: TextChunk[] = [];
  const text = fg(theme.text.default);
  const subdued = fg(theme.text.subdued);
  const accent = fg(theme.text.action.primary.default);
  const success = fg(theme.text.feedback.success.default);
  const warning = fg(theme.text.feedback.warning.default);
  const error = fg(theme.text.feedback.error.default);
  const add = (...items: TextChunk[]) => chunks.push(...items);
  const gap = () => add(text("\n"));
  const heading = (marker: TextChunk, label: string) =>
    add(marker, bold(subdued(` ${label}`)), text("\n"));

  if (!snapshot) {
    return new StyledText([dim(subdued("Subagent is no longer tracked."))]);
  }
  for (const item of snapshot.transcript) {
    if (item.kind === "user") {
      heading(accent("|"), "YOU");
      add(text(item.text), text("\n"));
      gap();
      continue;
    }
    if (item.kind === "toolResult") {
      heading(item.isError ? error("!") : success("+"), item.name);
      add(subdued(item.outputPreview || "(no output)"), text("\n"));
      gap();
      continue;
    }
    heading(accent("|"), "AGENT");
    for (const part of item.parts) {
      if (part.type === "text") {
        add(text(part.text), text("\n"));
        continue;
      }
      if (part.type === "thinking") {
        add(
          dim(subdued("~ ")),
          dim(subdued(part.redacted ? "[redacted reasoning]" : part.text)),
          text("\n"),
        );
        continue;
      }
      add(warning("> "), bold(text(part.name)), text("\n"));
      if (part.argsPreview) add(subdued(part.argsPreview), text("\n"));
    }
    gap();
  }
  if (snapshot.liveAssistant) {
    heading(warning("*"), "AGENT  STREAMING");
    if (snapshot.liveAssistant.thinking) {
      add(
        dim(subdued(`~ ${snapshot.liveAssistant.thinking}`)),
        text("\n"),
      );
    }
    if (snapshot.liveAssistant.text) {
      add(text(snapshot.liveAssistant.text), text("\n"));
    }
    gap();
  }
  for (const tool of snapshot.liveTools) {
    heading(warning("*"), `${tool.name}  RUNNING`);
    add(subdued(tool.outputPreview ?? tool.argsPreview ?? ""), text("\n"));
    gap();
  }
  for (const message of snapshot.queued) {
    heading(subdued("."), `QUEUED  ${message.kind.toUpperCase()}`);
    add(subdued(message.text), text("\n"));
    gap();
  }
  if (!chunks.length) return new StyledText([dim(subdued("Waiting for output..."))]);
  chunks.pop();
  return new StyledText(chunks);
}

export function Detail(props: {
  ctx: Context;
  bridge: BridgeClient;
  id: string;
  snapshots: () => ReadonlyArray<SubagentSnapshot>;
  back: () => void;
  draft: () => string;
  setDraft: (text: string) => void;
}) {
  const current = () =>
    props.bridge.snapshots().find((item) => item.id === props.id);
  let title: TextRenderable | undefined;
  let status: TextRenderable | undefined;
  let meta: TextRenderable | undefined;
  let cwd: TextRenderable | undefined;
  let error: TextRenderable | undefined;
  let transcript: ScrollBoxRenderable | undefined;
  let transcriptBody: TextRenderable | undefined;
  let input: InputRenderable | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  const statusColor = (snapshot: SubagentSnapshot | undefined) => {
    if (snapshot?.status === "done")
      return props.ctx.theme.text.feedback.success.default;
    if (snapshot?.status === "error")
      return props.ctx.theme.text.feedback.error.default;
    return props.ctx.theme.text.feedback.warning.default;
  };
  const refresh = () => {
    const snapshot = current();
    if (title)
      title.content = `${snapshot?.id ?? props.id} · ${snapshot?.title ?? "Subagent"}`;
    if (status) {
      status.content = snapshot?.status ?? "missing";
      status.fg = statusColor(snapshot);
    }
    if (meta)
      meta.content = `${snapshot?.backend ?? "?"} · ${snapshot?.meta.modelLabel ?? "?"} · ${formatContextUtilization(snapshot?.usage ?? {}) || "? context"} · ${snapshot ? formatElapsed(snapshot) : "?"}`;
    if (cwd) cwd.content = snapshot?.cwd ?? "";
    if (error) {
      error.content = snapshot?.errorText ? `error: ${snapshot.errorText}` : "";
      error.visible = Boolean(snapshot?.errorText);
    }
    if (transcriptBody)
      transcriptBody.content = transcriptText(snapshot, props.ctx.theme);
    transcript?.requestRender();
    props.ctx.renderer.requestRender();
  };
  const unsubscribe = props.bridge.subscribe(() => {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      refresh();
    }, 50);
  });

  props.ctx.keymap.layer(() => ({
    mode: "global",
    priority: 100,
    commands: [
      { id: "subagents.detail.back", title: "Back from subagent", bind: "escape", run: props.back },
      { id: "subagents.detail.scroll-up", title: "Scroll transcript up", bind: "pageup", run: () => transcript?.scrollBy(-8) },
      { id: "subagents.detail.scroll-down", title: "Scroll transcript down", bind: "pagedown", run: () => transcript?.scrollBy(8) },
      { id: "subagents.abort.detail", title: "Abort subagent", bind: "ctrl+x", run: () => props.bridge.abort(props.id) },
    ],
  }));

  const initial = current();
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      backgroundColor={props.ctx.theme.background.default}
      on:destroyed={() => {
        unsubscribe();
        if (refreshTimer) clearTimeout(refreshTimer);
      }}
    >
      <box
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        border={["bottom"]}
        borderColor={props.ctx.theme.border.default}
        backgroundColor={props.ctx.theme.background.surface.offset}
      >
        <text fg={props.ctx.theme.text.subdued}>SUBAGENT</text>
        <box flexDirection="row" justifyContent="space-between">
          <text ref={(value) => (title = value)} fg={props.ctx.theme.text.action.primary.default}>
            {initial?.id ?? props.id} · {initial?.title ?? "Subagent"}
          </text>
          <text ref={(value) => (status = value)} fg={statusColor(initial)}>
            {initial?.status ?? "missing"}
          </text>
        </box>
        <text ref={(value) => (meta = value)} fg={props.ctx.theme.text.subdued}>
          {initial?.backend ?? "?"} · {initial?.meta.modelLabel ?? "?"} · {formatContextUtilization(initial?.usage ?? {}) || "? context"} · {initial ? formatElapsed(initial) : "?"}
        </text>
        <text ref={(value) => (cwd = value)} fg={props.ctx.theme.text.subdued}>{initial?.cwd ?? ""}</text>
        <text
          ref={(value) => (error = value)}
          visible={Boolean(initial?.errorText)}
          fg={props.ctx.theme.text.feedback.error.default}
        >
          {initial?.errorText ? `error: ${initial.errorText}` : ""}
        </text>
      </box>

      <scrollbox
        ref={(value) => (transcript = value)}
        flexGrow={1}
        paddingX={2}
        paddingTop={2}
        paddingBottom={1}
        scrollY
        stickyScroll
        stickyStart="bottom"
        backgroundColor={props.ctx.theme.background.default}
        viewportOptions={{ backgroundColor: props.ctx.theme.background.default }}
        contentOptions={{ backgroundColor: props.ctx.theme.background.default }}
      >
        <text
          ref={(value) => (transcriptBody = value)}
          fg={props.ctx.theme.text.default}
          wrapMode="word"
        >
          {transcriptText(initial, props.ctx.theme)}
        </text>
      </scrollbox>

      <box
        flexDirection="column"
        flexShrink={0}
        paddingX={2}
        paddingTop={1}
        paddingBottom={1}
        border={["top"]}
        borderColor={props.ctx.theme.border.default}
        backgroundColor={props.ctx.theme.background.surface.offset}
      >
        <box flexDirection="row" height={1} flexShrink={0}>
          <text fg={props.ctx.theme.text.action.primary.default}>{"> "}</text>
          <input
            ref={(value) => (input = value)}
            flexGrow={1}
            focused
            value={props.draft()}
            placeholder="Send a follow-up"
            backgroundColor={props.ctx.theme.background.formfield.default}
            focusedBackgroundColor={props.ctx.theme.background.formfield.focused}
            textColor={props.ctx.theme.text.formfield.default}
            focusedTextColor={props.ctx.theme.text.formfield.focused}
            placeholderColor={props.ctx.theme.text.subdued}
            onInput={(value) => props.setDraft(value)}
            on:enter={() => {
              const text = input?.value.trim() ?? "";
              if (!text) return;
              props.bridge.steer(props.id, text);
              props.setDraft("");
              if (input) input.value = "";
            }}
          />
        </box>
        <text fg={props.ctx.theme.text.subdued}>
          Enter send · Esc back · Ctrl+X abort · PgUp/PgDn scroll
        </text>
      </box>
    </box>
  );
}

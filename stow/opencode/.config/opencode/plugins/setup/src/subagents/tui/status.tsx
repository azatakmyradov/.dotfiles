import type { TextRenderable } from "@opentui/core";
import type { Context } from "@opencode-ai/plugin/tui/context";
import type { SubagentSnapshot } from "../domain.ts";
import type { BridgeClient } from "./bridge.ts";

function statusText(items: ReadonlyArray<SubagentSnapshot>) {
  const running = items.filter((item) => item.status === "running").length;
  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  return `subagents ${running} running / ${done} done / ${failed} failed`;
}

export function Status(props: {
  ctx: Context;
  bridge: BridgeClient;
  sessionID?: string;
  open: () => void;
}) {
  const snapshots = () =>
    props.bridge
      .snapshots()
      .filter(
        (item) => !props.sessionID || item.parentSessionID === props.sessionID,
      );
  let text: TextRenderable | undefined;
  const unsubscribe = props.bridge.subscribe(() => {
    if (!text) return;
    text.content = statusText(snapshots());
    text.requestRender();
    props.ctx.renderer.requestRender();
  });

  props.ctx.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "subagents",
        title: "Subagents",
        description: "List, inspect, and control subagents",
        slash: { name: "subagents" },
        run: props.open,
      },
    ],
  }));

  return (
    <text
      ref={(value) => (text = value)}
      fg={props.ctx.theme.text.subdued}
      on:destroyed={unsubscribe}
    >
      {statusText(snapshots())}
    </text>
  );
}

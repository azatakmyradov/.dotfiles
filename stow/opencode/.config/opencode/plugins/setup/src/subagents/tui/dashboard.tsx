import type { Context } from "@opencode-ai/plugin/tui/context";
import { formatElapsed, type SubagentSnapshot } from "../domain.ts";
import { formatContextUtilization } from "../format.ts";
import type { BridgeClient } from "./bridge.ts";

export function orderSnapshots(items: ReadonlyArray<SubagentSnapshot>) {
  return [...items].sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (b.status === "running" && a.status !== "running") return 1;
    return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
  });
}

export function stableSelection(
  items: ReadonlyArray<SubagentSnapshot>,
  selected: string | undefined,
) {
  return items.some((item) => item.id === selected) ? selected : items[0]?.id;
}

export function Dashboard(props: {
  ctx: Context;
  bridge: BridgeClient;
  snapshots: () => ReadonlyArray<SubagentSnapshot>;
  back: () => void;
}) {
  const rows = () => orderSnapshots(props.snapshots());
  let selectedId = rows()[0]?.id;
  const openSnapshot = (snapshot: SubagentSnapshot) => {
    props.ctx.ui.router.navigate({
      type: "plugin",
      name: "subagent-detail",
      data: { id: snapshot.id },
    });
  };
  const choose = () =>
    props.ctx.ui.dialog.select({
      title: "Subagents",
      options: orderSnapshots(props.snapshots()).map((snapshot) => ({
        title: `${snapshot.id} ${snapshot.title}`,
        value: snapshot.id,
        description: `${snapshot.backend} | ${snapshot.status} | ${formatElapsed(snapshot)}`,
      })),
    });

  props.ctx.keymap.layer(() => ({
    mode: "global",
    priority: 100,
    commands: [
      {
        id: "subagents.back",
        title: "Back from subagents",
        bind: "escape",
        run: props.back,
      },
      {
        id: "subagents.open",
        title: "Open subagent",
        run: async () => {
          const id = await choose();
          const snapshot = props.snapshots().find((item) => item.id === id);
          if (!snapshot) return;
          openSnapshot(snapshot);
        },
      },
      {
        id: "subagents.abort",
        title: "Abort subagent",
        run: async () => {
          const id = await choose();
          if (id) props.bridge.abort(id);
        },
      },
    ],
  }));

  return (
    <box
      flexDirection="column"
      padding={1}
      gap={1}
      backgroundColor={props.ctx.theme.background.default}
    >
      <text fg={props.ctx.theme.text.default}>Subagents</text>
      {rows().length > 0
        ? <select
            focused
            height={Math.max(1, rows().length * 2)}
            options={rows().map((snapshot) => ({
              name: `${snapshot.status === "running" ? ">" : snapshot.status === "done" ? "+" : "!"} ${snapshot.id} ${snapshot.title}`,
              description: `${snapshot.backend} | ${snapshot.meta.modelLabel ?? "?"} | ${formatContextUtilization(snapshot.usage) || "? context"} | ${formatElapsed(snapshot)}`,
              value: snapshot.id,
            }))}
            backgroundColor={props.ctx.theme.background.default}
            textColor={props.ctx.theme.text.default}
            focusedBackgroundColor={props.ctx.theme.background.default}
            focusedTextColor={props.ctx.theme.text.default}
            selectedBackgroundColor={props.ctx.theme.background.action.primary.selected}
            selectedTextColor={props.ctx.theme.text.action.primary.selected}
            descriptionColor={props.ctx.theme.text.subdued}
            selectedDescriptionColor={props.ctx.theme.text.action.primary.selected}
            showSelectionIndicator
            showDescription
            itemSpacing={0}
            onChange={(_index, option) => {
              selectedId = typeof option?.value === "string" ? option.value : undefined;
            }}
            onSelect={(_index, option) => {
              const id = typeof option?.value === "string" ? option.value : selectedId;
              const snapshot = rows().find((item) => item.id === id);
              if (snapshot) openSnapshot(snapshot);
            }}
          />
        : <text fg={props.ctx.theme.text.default}>{props.bridge.connected() ? "No subagents." : "Subagent server bridge is disconnected."}</text>}
      <text fg={props.ctx.theme.text.subdued}>↑/↓ select | Enter open | Esc back | Commands: subagents.open, subagents.abort</text>
    </box>
  );
}

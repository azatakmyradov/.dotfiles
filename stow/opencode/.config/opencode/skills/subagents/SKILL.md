---
name: subagents
description: Invoke this skill when the user asks to use subagents, child agents, OpenCode agents, Claude Code agents, or Codex agents. It routes OpenCode delegation to native task subagents and reserves the plugin's external harnesses for Claude Code and Codex, preventing accidental fan-out across both systems.
---

# Subagents

OpenCode has two separate subagent systems. Choose one system for a task; do not spawn the same work through both.

## Choose the System

### Native Task Subagents

Use the native `subagent` tool for generic requests such as “use subagents”, “delegate this”, “use an explore agent”, or “parallelize the investigation”. Native agents are the default unless the user names an external harness.

- `explore`: search and understand the codebase.
- `general`: perform a complex, multi-step task.
- `subagent`: perform a focused task when neither specialization fits.

Start with one native agent. Add agents only for clearly independent work that benefits from parallel execution. Do not treat the concurrency limit as a target, and do not split one investigation into several overlapping searches.

### External Harness Subagents

Use `subagent_spawn` only when the user explicitly asks for Claude Code, Codex, a CLI harness, an external/custom subagent, or specifies one of those harnesses with a model or reasoning effort. The plugin does not provide an OpenCode harness. An “OpenCode agent” request means a native task subagent.

External harness children are headless, have their own context windows, cannot see the parent conversation, cannot ask the user, and cannot spawn subagents or workflows. Give every child a self-contained prompt with paths, constraints, and the expected report.

If wording is genuinely ambiguous, prefer one native subagent rather than spawning external harnesses or both systems. Ask only when the harness choice materially affects the requested result.

## Claude Code Harness

**Harness:** `claude`
**Prompt nicknames:** “claude”, “Claude Code”, “claude agent”, “claude subagent”, "cc"
**Best default:** use the latest fable model on high reasoning. Do not default to anything else, if the user does not specify, use fable.

| Model hint | Model               | Recommended effort |
| ---------- | ------------------- | ------------------ |
| `fable`    | latest Claude Fable | `high`             |

**Thinking budgets:** `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. The extension maps these to Claude thinking-token budgets: 0, 1,024, 4,096, 10,000, 16,000, 32,000, and 63,999 tokens respectively.

Requires Claude Code to be installed and authenticated. It runs without interactive permission prompts and may modify files or execute commands.

## Codex Harness

**Harness:** `codex`
**Prompt nicknames:** “codex”, “Codex CLI”, “codex agent”, “codex subagent”
**Best default:** `gpt-5.6-sol` with `high` effort for coding work. Do not use anything other than sol unless the user specifically asks for it.

| Model           | Recommended effort |
| --------------- | ------------------ |
| `gpt-5.6-sol`   | `high`             |
| `gpt-5.6-terra` | `high`             |
| `gpt-5.6-luna`  | `high`             |

**Thinking budgets accepted by the extension:** `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. Codex maps these to the nearest effort supported by the selected model; `off`/`minimal` become `minimal`, while `max` becomes the highest extension-supported Codex effort.

Requires the Codex CLI to be installed and authenticated. It runs with `danger-full-access` and no interactive approvals.

## Spawn and Manage

Call `subagent_spawn` with a complete `prompt`, short `name`, chosen `harness`, and optional `working_dir`, `model`, and `reasoning_effort`. At most four subagents run concurrently.

The limit of four is a safety ceiling, not a recommended batch size. Spawn the minimum number needed, avoid overlapping assignments, and never mirror native-agent work with an external harness run.

- `subagent_check({ id })`: peek without blocking.
- `subagent_list()`: list all runs.
- `subagent_wait({ ids })`: block only when results are required to proceed.
- `subagent_cancel({ ids })`: stop runs while preserving partial transcripts.
- `/subagents`: inspect or take over a run interactively.

Results return automatically. After spawning, continue useful parent work instead of immediately waiting.

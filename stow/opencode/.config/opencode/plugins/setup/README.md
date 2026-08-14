# OpenCode setup

This package provides two OpenCode V2 plugins:

- `index.ts`: authoritative subagent server plugin
- `tui.ts`: `/implement`, `/commit`, `/create-pr`, `/save-md`, and the `/subagents` TUI client

Plugin-managed subagents run through the Claude Agent SDK or Codex app-server.
The server owns lifecycle state, four-running and 64-tracked limits,
cancellation, result delivery, and external processes. Both backends receive
model-inactive shadow OpenCode sessions so every entry has a navigable session
ID. Native OpenCode task subagents remain managed by OpenCode itself and do not
appear in the plugin's `/subagents` dashboard.

## Installation

Install dependencies, then load `index.ts` in the OpenCode V2 server plugin
configuration and `tui.ts` in the TUI plugin configuration:

```bash
bun install
```

Server plugin entry: `/Users/azatakmyradov/personal/opencode-setup/index.ts`

TUI plugin entry: `/Users/azatakmyradov/personal/opencode-setup/tui.ts`

The server and TUI communicate through an authenticated, user-only Unix socket
under `/tmp/opencode-subagents-$UID`. This fallback is intentional: the pinned
V2 beta can preserve synthetic metadata, but model-inactive synthetic controls
remain pending and may later enter model context, while the Promise server
plugin cannot replay missed synthetic events after reload.

## Tools

- `subagent_spawn`
- `subagent_wait`
- `subagent_cancel`
- `subagent_check`
- `subagent_list`
- `/subagents`
- `/commit [instructions]`
- `/commit-model`
- `/create-pr [instructions]`
- `/save-md <name>`

`/commit` inspects the current repository, asks before committing on
`main` or staging unstaged files, and runs Git without bypassing hooks. It uses
the current session model when available in an isolated generation request to
create a repository-style commit subject; optional command text guides that
generation.
Use `/commit-model` or **Select commit model** in the command palette to choose
an enabled model for the current repository. The selection persists across TUI
restarts.

`/create-pr` requires `git`, an `origin` remote, and an authenticated GitHub CLI
(`gh auth login`). It inspects the current repository's branch, default remote
base, commits, diff, changed files, and pull request templates. It uses the model
selected by `/commit-model`, falling back to the session model when available;
optional command text guides title and body generation. The command rejects
detached `HEAD` and `main`, reports an existing pull request without changing
it, and shows the generated title, base, and body for confirmation before it
pushes or creates anything remotely.

`/save-md` saves the latest assistant response to `<name>.md` in the active
session directory. It preserves Markdown text, excludes reasoning and tool
content, and refuses to overwrite an existing file.

Results not consumed by wait or cancel are queued exactly once into their
originating parent session after it becomes idle. OpenCode's native task
subagents cannot access plugin `subagent_*` tools, preventing recursive external
harness delegation.

## Permissions

Claude runs headlessly with `bypassPermissions`; unrestricted children inherit
Claude Code user configuration. A supplied tool allowlist isolates settings,
MCP servers, hooks, and plugins. Claude Code must be installed and authenticated.

Codex starts app-server with `approvalPolicy: "never"` and
`sandbox: "danger-full-access"`. The Codex CLI must be installed and
authenticated. Both backends can modify the selected working directory and run
commands without interactive approval. Cancellation and plugin shutdown kill
their process trees.

## Development

```bash
bun test
bun run typecheck
```

Changing a local plugin file triggers V2 plugin reload. Restart OpenCode after
dependency changes. Plugin unload or service restart kills all managed external
children rather than attempting reattachment.

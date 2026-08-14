import type { Context } from "@opencode-ai/plugin/tui/context";
import type { ModelInfo, ModelRef } from "@opencode-ai/client";
import {
  runProcess,
  spawnGit,
  type ProcessResult,
  type ProcessRunner,
} from "./process.ts";

interface CommitSettings {
  models: Record<string, ModelRef>;
}

export type GitResult = ProcessResult;

export interface CommitDependencies {
  git: ProcessRunner;
}

async function runGit(
  deps: CommitDependencies,
  args: readonly string[],
  directory: string,
  signal: AbortSignal,
): Promise<string> {
  return runProcess("git", deps.git, args, directory, signal);
}

function hasUnstagedChanges(status: string): boolean {
  return status.split("\n").some((line) => {
    if (!line) return false;
    return line.startsWith("??") || (line.length > 1 && line[1] !== " ");
  });
}

function normalizeMessage(text: string): string {
  const message = text
    .replace(/^```[^\n]*\n?|```$/g, "")
    .trim()
    .replace(/^(?:commit message|message):\s*/i, "")
    .replace(/^(["'`])|(["'`])$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!message) throw new Error("The commit model returned an empty message");
  if (/[\x00-\x1f\x7f]/.test(message)) {
    throw new Error("The commit model returned an invalid message");
  }
  return message;
}

function normalizeBranch(text: string): string {
  return text
    .trim()
    .replace(/^```[^\n]*\n?|```$/g, "")
    .split(/\s+/)[0]!
    .replace(/^refs\/heads\//, "")
    .replace(/^(["'`])|(["'`])$/g, "");
}

function generationError(model: ModelRef | undefined, error: unknown): Error {
  const detail = error instanceof Error ? `: ${error.message}` : "";
  const label = model ? `${model.providerID}/${model.id}` : "default model";
  return new Error(`Commit model ${label} is unavailable${detail}`);
}

async function generateText(
  ctx: Context,
  directory: string,
  prompt: string,
  model: ModelRef | undefined,
  signal: AbortSignal,
): Promise<string> {
  try {
    const result = await ctx.client.generate.text(
      {
        location: { directory },
        prompt,
        model,
      },
      { signal },
    );
    return result.text;
  } catch (error) {
    throw generationError(model, error);
  }
}

async function createBranch(
  ctx: Context,
  deps: CommitDependencies,
  directory: string,
  status: string,
  instructions: string,
  model: ModelRef | undefined,
  signal: AbortSignal,
): Promise<void> {
  const generated = await generateText(
    ctx,
    directory,
    `Generate a short lowercase Git branch name for these changes. Use only letters, digits, hyphens, and slashes. Return only the branch name.\n\nStatus:\n${status}\n\nUser instructions:\n${instructions || "None"}`,
    model,
    signal,
  );
  const base = normalizeBranch(generated);
  if (!base || !/^[a-z0-9][a-z0-9/-]*$/.test(base)) {
    throw new Error("The commit model returned an invalid branch name");
  }
  await runGit(deps, ["check-ref-format", "--branch", base], directory, signal);

  let branch = base;
  for (let suffix = 2; suffix < 100; suffix++) {
    const exists = await deps.git(
      ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
      directory,
      signal,
    );
    if (exists.exitCode !== 0) break;
    branch = `${base}-${suffix}`;
  }
  await runGit(deps, ["switch", "-c", branch], directory, signal);
}

function commitPrompt(input: {
  status: string;
  diff: string;
  recent: string;
  instructions: string;
}): string {
  return [
    "Write one concise Git commit subject for the staged changes below.",
    "Match the repository's recent commit style. Return only the commit message, with no quotes, Markdown, explanation, or alternatives.",
    `User instructions:\n${input.instructions || "None"}`,
    `Git status:\n${input.status || "Clean outside the index"}`,
    `Staged diff:\n${input.diff}`,
    `Recent commit subjects:\n${input.recent || "None"}`,
  ].join("\n\n");
}

export function setupCommit(
  ctx: Context,
  dependencies: CommitDependencies = { git: spawnGit },
) {
  let running = false;
  let stopRequested = false;
  let controller: AbortController | undefined;
  const [settings, updateSettings] = ctx.storage.store<CommitSettings>(
    "commit.settings",
    { initial: { models: {} } },
  );

  const locationModel = (directory: string, sessionModel?: ModelRef) =>
    settings.models[directory] ?? sessionModel;

  const selectModel = async () => {
    const route = ctx.ui.router.current();
    if (route.type !== "session") {
      ctx.ui.toast.show({
        message: "/commit-model must be run from a session",
        variant: "warning",
      });
      return;
    }
    const session = ctx.data.session.get(route.sessionID);
    if (!session) {
      ctx.ui.toast.show({ message: "Current session is unavailable", variant: "error" });
      return;
    }

    try {
      const directory = session.location.directory;
      const response = await ctx.client.model.list({ location: { directory } });
      const models = response.data
        .filter((model) => model.enabled)
        .sort((a, b) =>
          `${a.providerID}/${a.name}`.localeCompare(`${b.providerID}/${b.name}`),
        );
      if (models.length === 0) {
        ctx.ui.toast.show({ message: "No enabled models are available", variant: "warning" });
        return;
      }
      const current = locationModel(directory, session.model);
      const selected = await ctx.ui.dialog.select({
        title: "Commit model",
        placeholder: "Select a model for commit messages",
        current: current ? `${current.providerID}/${current.id}` : undefined,
        options: models.map((model: ModelInfo) => ({
          title: model.name,
          value: `${model.providerID}/${model.id}`,
          description: model.providerID,
        })),
      });
      if (!selected) return;
      const model = models.find((item) => `${item.providerID}/${item.id}` === selected);
      if (!model) return;
      await updateSettings((draft) => {
        draft.models[directory] = { providerID: model.providerID, id: model.id };
      });
      ctx.ui.toast.show({
        message: `Commit model set to ${model.providerID}/${model.id}`,
        variant: "success",
      });
    } catch (error) {
      ctx.ui.toast.show({
        message: error instanceof Error ? error.message : "Could not load models",
        variant: "error",
      });
    }
  };

  const disposeSlot = ctx.ui.slot({
    append: "app",
    render: () => {
      ctx.keymap.layer(() => ({
        mode: "global",
        commands: [
          {
            id: "commit",
            title: "Commit changes",
            description: "Safely stage changes and generate a Git commit message",
            slash: { name: "commit", arguments: true },
            run: async (input) => {
              if (running) {
                ctx.ui.toast.show({
                  message: "A commit operation is already in progress",
                  variant: "warning",
                });
                return;
              }
              const route = ctx.ui.router.current();
              const session = route.type === "session"
                ? ctx.data.session.get(route.sessionID)
                : undefined;
              if (route.type === "session" && !session) {
                ctx.ui.toast.show({ message: "Current session is unavailable", variant: "error" });
                return;
              }

              running = true;
              stopRequested = false;
              controller = new AbortController();
              const signal = controller.signal;
              const location = session?.location ?? ctx.location ?? ctx.data.location.default();
              const directory = location.directory;
              const model = locationModel(directory, session?.model);
              const instructions = input?.trim() ?? "";
              try {
                ctx.ui.toast.show({ message: "Inspecting Git changes...", variant: "info" });
                const [branch, initialStatus, recent] = await Promise.all([
                  runGit(dependencies, ["branch", "--show-current"], directory, signal),
                  runGit(dependencies, ["status", "--porcelain"], directory, signal),
                  runGit(
                    dependencies,
                    ["log", "-10", "--pretty=format:%s"],
                    directory,
                    signal,
                  ),
                ]);

                if (branch === "main") {
                  const create = await ctx.ui.dialog.confirm({
                    title: "Commit on main?",
                    message: "Create a new branch instead of committing directly to main?",
                    label: { confirm: "Create branch", cancel: "Commit to main" },
                  });
                  if (create === undefined) return;
                  if (create) {
                    await createBranch(
                      ctx,
                      dependencies,
                      directory,
                      initialStatus,
                      instructions,
                      model,
                      signal,
                    );
                  }
                }

                let status = initialStatus;
                if (hasUnstagedChanges(status)) {
                  const stage = await ctx.ui.dialog.confirm({
                    title: "Stage all changes?",
                    message: "Unstaged or untracked changes exist. Stage all changes for this commit?",
                    label: { confirm: "Stage all", cancel: "Staged only" },
                  });
                  if (stage === undefined) return;
                  if (stage) {
                    await runGit(dependencies, ["add", "-A"], directory, signal);
                    status = await runGit(
                      dependencies,
                      ["status", "--porcelain"],
                      directory,
                      signal,
                    );
                  }
                }

                const [diff, stagedFiles] = await Promise.all([
                  runGit(dependencies, ["diff", "--cached"], directory, signal),
                  runGit(dependencies, ["diff", "--cached", "--name-only"], directory, signal),
                ]);
                if (!stagedFiles) {
                  ctx.ui.toast.show({ message: "Nothing staged to commit", variant: "warning" });
                  return;
                }

                ctx.ui.toast.show({ message: "Generating commit message...", variant: "info" });
                const generated = await generateText(
                  ctx,
                  directory,
                  commitPrompt({ status, diff, recent, instructions }),
                  model,
                  signal,
                );
                const message = normalizeMessage(generated);
                const commitStartedAt = Date.now();
                ctx.ui.toast.show({
                  message: "Running git commit (pre-commit hooks may take a while)...",
                  variant: "info",
                });
                const progressTimer = setInterval(() => {
                  const elapsed = Math.max(1, Math.floor((Date.now() - commitStartedAt) / 1_000));
                  ctx.ui.toast.show({
                    message: `Git commit is still running (${elapsed}s); waiting for hooks...`,
                    variant: "info",
                  });
                }, 10_000);
                try {
                  await runGit(dependencies, ["commit", "-m", message], directory, signal);
                } finally {
                  clearInterval(progressTimer);
                }
                const hash = await runGit(
                  dependencies,
                  ["rev-parse", "--short", "HEAD"],
                  directory,
                  signal,
                );
                ctx.ui.toast.show({
                  message: `Committed ${hash}: ${message}`,
                  variant: "success",
                });
              } catch (error) {
                if (signal.aborted && stopRequested) {
                  ctx.ui.toast.show({ message: "Commit operation stopped", variant: "warning" });
                } else if (!signal.aborted) {
                  ctx.ui.toast.show({
                    message: error instanceof Error ? error.message : "Could not commit changes",
                    variant: "error",
                  });
                }
              } finally {
                running = false;
                controller = undefined;
              }
            },
          },
          {
            id: "commit.stop",
            title: "Stop commit",
            description: "Stop the active Git commit operation",
            slash: { name: "commit-stop" },
            run: () => {
              if (!running || !controller) {
                ctx.ui.toast.show({
                  message: "No commit operation is running",
                  variant: "warning",
                });
                return;
              }
              stopRequested = true;
              ctx.ui.toast.show({ message: "Stopping commit operation...", variant: "info" });
              controller.abort();
            },
          },
          {
            id: "commit.model",
            title: "Select commit model",
            description: "Choose the model used to generate Git commit messages",
            palette: true,
            slash: { name: "commit-model" },
            run: selectModel,
          },
        ],
      }));
      return null;
    },
  });

  return () => {
    controller?.abort();
    disposeSlot();
  };
}

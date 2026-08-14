import type { ModelRef } from "@opencode-ai/client";
import type { Context } from "@opencode-ai/plugin/tui/context";
import {
  processError,
  runProcess,
  spawnGh,
  spawnGit,
  type ProcessRunner,
} from "./process.ts";

interface CommitSettings {
  models: Record<string, ModelRef>;
}

export interface PullRequestDependencies {
  git: ProcessRunner;
  gh: ProcessRunner;
  readTemplates(directory: string): Promise<string>;
}

interface PullRequestContent {
  title: string;
  body: string;
  base: string;
}

async function readTemplates(directory: string): Promise<string> {
  const names = [
    ".github/pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "docs/pull_request_template.md",
    "PULL_REQUEST_TEMPLATE.md",
  ];
  const directoryGlob = new Bun.Glob(".github/PULL_REQUEST_TEMPLATE/*.md");
  for await (const name of directoryGlob.scan({ cwd: directory, onlyFiles: true })) {
    names.push(name);
  }

  const templates: string[] = [];
  for (const name of [...new Set(names)]) {
    const file = Bun.file(`${directory}/${name}`);
    if (await file.exists()) templates.push(`Template: ${name}\n${await file.text()}`);
  }
  return templates.join("\n\n");
}

function generationError(model: ModelRef | undefined, error: unknown): Error {
  const detail = error instanceof Error ? `: ${error.message}` : "";
  const label = model ? `${model.providerID}/${model.id}` : "default model";
  return new Error(`Pull request model ${label} is unavailable${detail}`);
}

function generationPrompt(input: {
  branch: string;
  defaultBase: string;
  branches: readonly string[];
  commits: string;
  diff: string;
  files: string;
  template: string;
  instructions: string;
}): string {
  return [
    "Generate a pull request title, body, and base branch from the repository context below.",
    "Return strict JSON only, with exactly three string fields: title, body, and base. Do not use Markdown fences or add commentary.",
    "The title must be concise. The body must summarize the change and testing. Preserve and complete the pull request template when one is provided.",
    `Current branch:\n${input.branch}`,
    `Default base branch:\n${input.defaultBase}`,
    `Known branches (base must be one of these):\n${input.branches.join("\n")}`,
    `User instructions:\n${input.instructions || "None"}`,
    `Commits:\n${input.commits || "None"}`,
    `Changed files:\n${input.files || "None"}`,
    `Diff:\n${input.diff || "No diff"}`,
    `Pull request template:\n${input.template || "None"}`,
  ].join("\n\n");
}

function parseContent(text: string, branches: ReadonlySet<string>): PullRequestContent {
  let value: unknown;
  try {
    value = JSON.parse(text.trim());
  } catch {
    throw new Error("The pull request model returned malformed JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The pull request model returned invalid content");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.join(",") !== "base,body,title" ||
    typeof record.title !== "string" ||
    typeof record.body !== "string" ||
    typeof record.base !== "string"
  ) {
    throw new Error("The pull request model must return title, body, and base strings");
  }

  const title = record.title.replace(/\s+/g, " ").trim();
  const body = record.body.trim();
  const base = record.base.trim().replace(/^refs\/heads\//, "").replace(/^origin\//, "");
  if (
    !title ||
    !body ||
    /[\x00-\x1f\x7f]/.test(title) ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body)
  ) {
    throw new Error("The pull request model returned an invalid title or body");
  }
  if (!branches.has(base)) {
    throw new Error(`The pull request model returned unknown base branch: ${base || "(empty)"}`);
  }
  return { title, body, base };
}

function branchNames(refs: string): string[] {
  const names = new Set<string>();
  for (const ref of refs.split("\n").map((item) => item.trim()).filter(Boolean)) {
    if (ref === "origin/HEAD") continue;
    names.add(ref.replace(/^origin\//, ""));
  }
  return [...names];
}

export function setupCreatePullRequest(
  ctx: Context,
  dependencies: PullRequestDependencies = {
    git: spawnGit,
    gh: spawnGh,
    readTemplates,
  },
) {
  let running = false;
  let controller: AbortController | undefined;
  const [settings] = ctx.storage.store<CommitSettings>("commit.settings", {
    initial: { models: {} },
  });

  const disposeSlot = ctx.ui.slot({
    append: "app",
    render: () => {
      ctx.keymap.layer(() => ({
        mode: "global",
        commands: [
          {
            id: "create-pr",
            title: "Create pull request",
            description: "Generate, push, and create a GitHub pull request",
            slash: { name: "create-pr", aliases: ["pr"], arguments: true },
            run: async (input) => {
              if (running) {
                ctx.ui.toast.show({
                  message: "A pull request operation is already in progress",
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
              controller = new AbortController();
              const signal = controller.signal;
              const location = session?.location ?? ctx.location ?? ctx.data.location.default();
              const directory = location.directory;
              const git = (args: readonly string[]) =>
                runProcess("git", dependencies.git, args, directory, signal);
              const gh = (args: readonly string[]) =>
                runProcess("gh", dependencies.gh, args, directory, signal);
              try {
                ctx.ui.toast.show({ message: "Inspecting repository...", variant: "info" });
                const repository = await dependencies.git(
                  ["rev-parse", "--is-inside-work-tree"],
                  directory,
                  signal,
                );
                if (repository.exitCode !== 0 || repository.stdout.trim() !== "true") {
                  throw new Error("The active session directory is not a Git repository");
                }
                const branch = await git(["branch", "--show-current"]);
                if (!branch) throw new Error("Cannot create a pull request from detached HEAD");
                if (branch === "main") throw new Error("Cannot create a pull request from main");

                await git(["remote", "get-url", "origin"]);
                const auth = await dependencies.gh(["auth", "status"], directory, signal);
                if (auth.exitCode !== 0) {
                  throw new Error(
                    auth.stderr.trim() || auth.stdout.trim() || "GitHub CLI is not authenticated",
                  );
                }
                const existing = await dependencies.gh(
                  ["pr", "list", "--head", branch, "--state", "open", "--json", "url", "--jq", ".[0].url"],
                  directory,
                  signal,
                );
                if (existing.exitCode !== 0) {
                  throw processError("gh", ["pr", "list"], existing);
                }
                const existingUrl = existing.stdout.trim();
                if (existingUrl) {
                  ctx.ui.toast.show({
                    message: `Pull request already exists: ${existingUrl}`,
                    variant: "info",
                  });
                  return;
                }

                let defaultBaseResult = await dependencies.git(
                  ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
                  directory,
                  signal,
                );
                let defaultBase = defaultBaseResult.stdout.trim().replace(/^origin\//, "");
                if (defaultBaseResult.exitCode !== 0 || !defaultBase) {
                  defaultBase = await gh([
                    "repo",
                    "view",
                    "--json",
                    "defaultBranchRef",
                    "--jq",
                    ".defaultBranchRef.name",
                  ]);
                }
                if (!defaultBase) throw new Error("Could not resolve the default remote base branch");

                const refs = await git([
                  "for-each-ref",
                  "--format=%(refname:short)",
                  "refs/heads",
                  "refs/remotes/origin",
                ]);
                const branches = branchNames(refs);
                if (!branches.includes(defaultBase)) branches.push(defaultBase);
                const comparison = branches.includes(defaultBase)
                  ? `origin/${defaultBase}`
                  : defaultBase;
                const [commits, diff, files, template] = await Promise.all([
                  git(["log", `${comparison}..HEAD`, "--pretty=format:%h %s"]),
                  git(["diff", `${comparison}...HEAD`]),
                  git(["diff", "--name-only", `${comparison}...HEAD`]),
                  dependencies.readTemplates(directory),
                ]);
                if (!commits && !files) {
                  throw new Error(`No changes found between ${defaultBase} and ${branch}`);
                }

                ctx.ui.toast.show({ message: "Generating pull request...", variant: "info" });
                const model = settings.models[directory] ?? session?.model;
                let generated: string;
                try {
                  const response = await ctx.client.generate.text(
                    {
                      location: { directory },
                      prompt: generationPrompt({
                        branch,
                        defaultBase,
                        branches,
                        commits,
                        diff,
                        files,
                        template,
                        instructions: input?.trim() ?? "",
                      }),
                      model,
                    },
                    { signal },
                  );
                  generated = response.text;
                } catch (error) {
                  throw generationError(model, error);
                }
                const content = parseContent(generated, new Set(branches));
                const confirmed = await ctx.ui.dialog.confirm({
                  title: "Create pull request?",
                  message: `Title: ${content.title}\nBase: ${content.base}\n\n${content.body}`,
                  label: { confirm: "Push and create", cancel: "Cancel" },
                });
                if (!confirmed) return;

                await git(["push", "--set-upstream", "origin", branch]);
                const url = await gh([
                  "pr",
                  "create",
                  "--base",
                  content.base,
                  "--head",
                  branch,
                  "--title",
                  content.title,
                  "--body",
                  content.body,
                ]);
                if (!url) throw new Error("GitHub CLI did not return a pull request URL");
                ctx.ui.toast.show({
                  message: `Created pull request: ${url}`,
                  variant: "success",
                });
              } catch (error) {
                if (!signal.aborted) {
                  ctx.ui.toast.show({
                    message: error instanceof Error ? error.message : "Could not create pull request",
                    variant: "error",
                  });
                }
              } finally {
                running = false;
                controller = undefined;
              }
            },
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

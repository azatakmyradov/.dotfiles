import { describe, expect, mock, test } from "bun:test";
import type { ModelRef } from "@opencode-ai/client";
import type { Context, KeymapCommand, SlotClaim } from "@opencode-ai/plugin/tui/context";
import {
  setupCreatePullRequest,
  type PullRequestDependencies,
} from "../../src/git/pull-request.ts";
import type { ProcessResult } from "../../src/git/process.ts";

const ok = (stdout = ""): ProcessResult => ({ stdout, stderr: "", exitCode: 0 });
const generated = JSON.stringify({
  title: "Add pull request command",
  body: "## Summary\n\nAdds pull request automation.\n\n## Testing\n\n- bun test",
  base: "main",
});

function makeHarness(options?: {
  route?: "session" | "home";
  confirm?: boolean | undefined;
  model?: ModelRef;
  generation?: string;
  git?: (
    args: readonly string[],
    directory: string,
    signal: AbortSignal,
  ) => Promise<ProcessResult | undefined>;
  gh?: (
    args: readonly string[],
    directory: string,
    signal: AbortSignal,
  ) => Promise<ProcessResult | undefined>;
}) {
  let command: KeymapCommand | undefined;
  const gitCalls: string[][] = [];
  const ghCalls: string[][] = [];
  const toast = mock(() => {});
  const confirm = mock(async () => options?.confirm ?? true);
  const generationRequests: Array<{ model?: ModelRef; prompt: string }> = [];
  const generate = mock(async (request: { model?: ModelRef; prompt: string }) => {
    generationRequests.push(request);
    return { text: options?.generation ?? generated };
  });
  const settings = {
    models: options?.model ? { "/repo": options.model } : {},
  } as { models: Record<string, ModelRef> };
  const gitOutputs: Record<string, ProcessResult> = {
    "rev-parse --is-inside-work-tree": ok("true\n"),
    "branch --show-current": ok("feature/pr\n"),
    "remote get-url origin": ok("git@github.com:owner/repo.git\n"),
    "symbolic-ref --quiet --short refs/remotes/origin/HEAD": ok("origin/main\n"),
    "for-each-ref --format=%(refname:short) refs/heads refs/remotes/origin": ok(
      "feature/pr\nmain\norigin/main\norigin/feature/pr\n",
    ),
    "log origin/main..HEAD --pretty=format:%h %s": ok("abc123 feat: add PR command\n"),
    "diff origin/main...HEAD": ok("diff --git a/file.ts b/file.ts\n+change\n"),
    "diff --name-only origin/main...HEAD": ok("file.ts\n"),
    "push --set-upstream origin feature/pr": ok(),
  };
  const ghOutputs: Record<string, ProcessResult> = {
    "auth status": ok("Logged in\n"),
    "pr list --head feature/pr --state open --json url --jq .[0].url": ok(),
    "pr create --base main --head feature/pr --title Add pull request command --body ## Summary\n\nAdds pull request automation.\n\n## Testing\n\n- bun test": ok(
      "https://github.com/owner/repo/pull/1\n",
    ),
  };
  const git: PullRequestDependencies["git"] = async (args, directory, signal) => {
    gitCalls.push([...args]);
    const override = await options?.git?.(args, directory, signal);
    return override ?? gitOutputs[args.join(" ")] ?? ok();
  };
  const gh: PullRequestDependencies["gh"] = async (args, directory, signal) => {
    ghCalls.push([...args]);
    const override = await options?.gh?.(args, directory, signal);
    return override ?? ghOutputs[args.join(" ")] ?? ok();
  };
  const context = {
    ui: {
      slot: (claim: SlotClaim) => {
        if (claim.append !== "app") throw new Error("Expected app slot");
        (claim.render as (input: Record<string, never>) => unknown)({});
        return () => {};
      },
      router: {
        current: () =>
          options?.route === "home"
            ? { type: "home" as const }
            : { type: "session" as const, sessionID: "ses_1" },
      },
      dialog: { confirm },
      toast: { show: toast },
    },
    keymap: {
      layer: (factory: () => { commands?: readonly KeymapCommand[] }) => {
        command = factory().commands?.[0];
      },
    },
    data: {
      session: {
        get: () => ({
          location: { directory: "/repo" },
          model: { providerID: "anthropic", id: "session-model" },
        }),
      },
    },
    storage: { store: () => [settings, async () => {}] },
    client: { generate: { text: generate } },
    location: { directory: "/repo" },
  } as unknown as Context;

  setupCreatePullRequest(context, {
    git,
    gh,
    readTemplates: async () => "## Summary\n\n<!-- describe changes -->",
  });
  return {
    command: () => command,
    run: (input?: string) => command?.run(input) as Promise<void>,
    gitCalls,
    ghCalls,
    toast,
    confirm,
    generate,
    generationRequests,
  };
}

describe("/create-pr", () => {
  test("registers globally with argument support", () => {
    const harness = makeHarness();
    expect(harness.command()?.id).toBe("create-pr");
    expect(harness.command()?.slash).toEqual({
      name: "create-pr",
      aliases: ["pr"],
      arguments: true,
    });
  });

  test("runs from the new message screen", async () => {
    const harness = makeHarness({ route: "home" });
    await harness.run();
    expect(harness.ghCalls.some((args) => args[0] === "pr" && args[1] === "create")).toBeTrue();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Created pull request: https://github.com/owner/repo/pull/1",
      variant: "success",
    });
  });

  test("rejects concurrent runs and resets the guard after failure", async () => {
    let release!: (result: ProcessResult) => void;
    let blocked = true;
    const harness = makeHarness({
      git: async (args) => {
        if (args[0] === "rev-parse" && blocked) {
          blocked = false;
          return new Promise((resolve) => (release = resolve));
        }
        if (args[0] === "rev-parse") return { stdout: "", stderr: "not a repository", exitCode: 1 };
        return ok();
      },
    });
    const pending = harness.run();
    await Promise.resolve();
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "A pull request operation is already in progress",
      variant: "warning",
    });
    release({ stdout: "", stderr: "not a repository", exitCode: 1 });
    await pending;
    await harness.run();
    expect(harness.gitCalls.filter((args) => args[0] === "rev-parse")).toHaveLength(2);
  });

  test.each([
    ["", "Cannot create a pull request from detached HEAD"],
    ["main", "Cannot create a pull request from main"],
  ])("rejects unsafe branch %p", async (branch, message) => {
    const harness = makeHarness({
      git: async (args) =>
        args.join(" ") === "branch --show-current" ? ok(branch) : ok("true"),
    });
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({ message, variant: "error" });
    expect(harness.ghCalls).toHaveLength(0);
  });

  test("reports an existing pull request without generating or pushing", async () => {
    const harness = makeHarness({
      gh: async (args) =>
        args[1] === "list" ? ok("https://github.com/owner/repo/pull/7") : ok(),
    });
    await harness.run();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.gitCalls.some((args) => args[0] === "push")).toBeFalse();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Pull request already exists: https://github.com/owner/repo/pull/7",
      variant: "info",
    });
  });

  test("reports GitHub CLI authentication failures", async () => {
    const harness = makeHarness({
      gh: async (args) =>
        args[0] === "auth"
          ? { stdout: "", stderr: "not logged into any GitHub hosts", exitCode: 1 }
          : undefined,
    });
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "not logged into any GitHub hosts",
      variant: "error",
    });
    expect(harness.generate).not.toHaveBeenCalled();
  });

  test("falls back to GitHub when the remote HEAD is unavailable", async () => {
    const harness = makeHarness({
      git: async (args) =>
        args[0] === "symbolic-ref"
          ? { stdout: "", stderr: "ref not found", exitCode: 1 }
          : undefined,
      gh: async (args) => (args[0] === "repo" ? ok("main\n") : undefined),
    });
    await harness.run();
    expect(harness.ghCalls).toContainEqual([
      "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name",
    ]);
    expect(harness.generate).toHaveBeenCalled();
  });

  test("includes repository context and instructions using the selected model", async () => {
    const model = { providerID: "openai", id: "gpt-5" };
    const harness = makeHarness({ model });
    await harness.run("emphasize migration safety");
    const request = harness.generationRequests[0]!;
    expect(request.model).toEqual(model);
    expect(request.prompt).toContain("Default base branch:\nmain");
    expect(request.prompt).toContain("abc123 feat: add PR command");
    expect(request.prompt).toContain("diff --git a/file.ts b/file.ts");
    expect(request.prompt).toContain("file.ts");
    expect(request.prompt).toContain("<!-- describe changes -->");
    expect(request.prompt).toContain("emphasize migration safety");
  });

  test.each([
    ["not json", "The pull request model returned malformed JSON"],
    [JSON.stringify({ title: "Title", body: "Body", base: "unknown" }), "The pull request model returned unknown base branch: unknown"],
  ])("rejects invalid generation", async (generation, message) => {
    const harness = makeHarness({ generation });
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({ message, variant: "error" });
    expect(harness.gitCalls.some((args) => args[0] === "push")).toBeFalse();
  });

  test("cancels without pushing when confirmation is declined", async () => {
    const harness = makeHarness({ confirm: false });
    await harness.run();
    expect(harness.confirm).toHaveBeenCalled();
    expect(harness.gitCalls.some((args) => args[0] === "push")).toBeFalse();
  });

  test("pushes and creates the pull request with argument arrays", async () => {
    const harness = makeHarness();
    await harness.run();
    expect(harness.gitCalls).toContainEqual(["push", "--set-upstream", "origin", "feature/pr"]);
    expect(harness.ghCalls).toContainEqual([
      "pr", "create", "--base", "main", "--head", "feature/pr", "--title",
      "Add pull request command", "--body",
      "## Summary\n\nAdds pull request automation.\n\n## Testing\n\n- bun test",
    ]);
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Created pull request: https://github.com/owner/repo/pull/1",
      variant: "success",
    });
  });

  test.each([
    ["git", "push rejected"],
    ["gh", "GitHub API failed"],
  ])("reports %s mutation failures", async (failure, message) => {
    const harness = makeHarness({
      git: async (args) =>
        failure === "git" && args[0] === "push"
          ? { stdout: "", stderr: message, exitCode: 1 }
          : undefined,
      gh: async (args) =>
        failure === "gh" && args[1] === "create"
          ? { stdout: "", stderr: message, exitCode: 1 }
          : undefined,
    });
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({ message, variant: "error" });
  });
});

import { describe, expect, mock, test } from "bun:test";
import type {
  Context,
  KeymapCommand,
  SlotClaim,
} from "@opencode-ai/plugin/tui/context";
import {
  setupCommit,
  type CommitDependencies,
  type GitResult,
} from "../../src/git/commit.ts";

const ok = (stdout = ""): GitResult => ({ stdout, stderr: "", exitCode: 0 });

function makeHarness(options?: {
  route?: "session" | "home";
  confirms?: Array<boolean | undefined>;
  generate?: (prompt: string) => Promise<string>;
  git?: CommitDependencies["git"];
  models?: Array<{
    id: string;
    providerID: string;
    name: string;
    enabled: boolean;
  }>;
  selectedModel?: string;
}) {
  let command: KeymapCommand | undefined;
  let modelCommand: KeymapCommand | undefined;
  let stopCommand: KeymapCommand | undefined;
  const calls: string[][] = [];
  const confirms = [...(options?.confirms ?? [])];
  const toast = mock(() => {});
  const confirm = mock(async () => confirms.shift());
  const select = mock(async (_input: { options: unknown[] }) => options?.selectedModel);
  const settings = { models: {} as Record<string, { providerID: string; id: string }> };
  const generate = mock(async (input: {
    prompt: string;
    model?: { providerID: string; id: string };
  }) => ({
    text: await (options?.generate?.(input.prompt) ?? Promise.resolve("feat: commit changes")),
  }));
  const outputs: Record<string, GitResult> = {
    "branch --show-current": ok("feature\n"),
    "status --porcelain": ok("M  staged.ts\n"),
    "log -10 --pretty=format:%s": ok("feat: recent style\nfix: older"),
    "diff --cached": ok("diff --git a/staged.ts b/staged.ts\n+staged"),
    "diff --cached --name-only": ok("staged.ts\n"),
    "commit -m feat: commit changes": ok(),
    "rev-parse --short HEAD": ok("abc123\n"),
    "add -A": ok(),
  };
  const git: CommitDependencies["git"] = async (args, directory, signal) => {
    calls.push([...args]);
    if (options?.git) return options.git(args, directory, signal);
    return outputs[args.join(" ")] ?? ok();
  };
  const context = {
    ui: {
      slot: (claim: SlotClaim) => {
        if (claim.append !== "app") {
          throw new Error("Expected app slot");
        }
        claim.render({});
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
        const commands = factory().commands;
        command = commands?.[0];
        stopCommand = commands?.[1];
        modelCommand = commands?.[2];
      },
    },
    data: {
      session: {
        get: () => ({
          location: { directory: "/repo" },
          model: { providerID: "anthropic", id: "claude" },
        }),
      },
    },
    storage: {
      store: () => [
        settings,
        async (mutation: (draft: typeof settings) => void) => mutation(settings),
      ],
    },
    client: {
      generate: { text: generate },
      model: { list: mock(async () => ({ data: options?.models ?? [] })) },
    },
    location: { directory: "/repo" },
  } as unknown as Context;

  (context.ui.dialog as unknown as { select: typeof select }).select = select;

  setupCommit(context, { git });
  return {
    command: () => command,
    modelCommand: () => modelCommand,
    stopCommand: () => stopCommand,
    run: (input?: string) => command?.run(input) as Promise<void>,
    stop: () => stopCommand?.run() as Promise<void>,
    selectModel: () => modelCommand?.run() as Promise<void>,
    calls,
    toast,
    confirm,
    generate,
    select,
    settings,
  };
}

describe("/commit", () => {
  test("registers globally with argument support", () => {
    const harness = makeHarness();

    expect(harness.command()?.id).toBe("commit");
    expect(harness.command()?.slash).toEqual({ name: "commit", arguments: true });
    expect(harness.stopCommand()?.slash).toEqual({ name: "commit-stop" });
    expect(harness.modelCommand()?.slash).toEqual({ name: "commit-model" });
    expect(harness.modelCommand()?.palette).toBeTrue();
  });

  test("selects and persists an enabled repository model", async () => {
    const harness = makeHarness({
      selectedModel: "openai/gpt-5",
      models: [
        { id: "disabled", providerID: "other", name: "Disabled", enabled: false },
        { id: "gpt-5", providerID: "openai", name: "GPT-5", enabled: true },
      ],
    });

    await harness.selectModel();
    await harness.run();

    expect(harness.select.mock.calls[0]![0].options).toHaveLength(1);
    expect(harness.settings.models["/repo"]).toEqual({
      providerID: "openai",
      id: "gpt-5",
    });
    expect(harness.generate.mock.calls[0]![0].model).toEqual({
      providerID: "openai",
      id: "gpt-5",
    });
  });

  test("runs from the new message screen", async () => {
    const harness = makeHarness({ route: "home" });
    await harness.run();

    expect(harness.calls).toContainEqual(["commit", "-m", "feat: commit changes"]);
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Committed abc123: feat: commit changes",
      variant: "success",
    });
  });

  test("rejects concurrent runs", async () => {
    let release!: (result: GitResult) => void;
    let first = true;
    const harness = makeHarness({
      git: async (args) => {
        if (first) {
          first = false;
          return new Promise<GitResult>((resolve) => (release = resolve));
        }
        if (args.join(" ") === "diff --cached --name-only") return ok("staged.ts");
        if (args.join(" ") === "rev-parse --short HEAD") return ok("abc123");
        return ok(args[0] === "branch" ? "feature" : "");
      },
    });

    const pending = harness.run();
    await Promise.resolve();
    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "A commit operation is already in progress",
      variant: "warning",
    });
    release(ok("feature"));
    await pending;
  });

  test("prompts before committing on main and creates a generated branch", async () => {
    const harness = makeHarness({
      confirms: [true],
      generate: async (prompt) =>
        prompt.startsWith("Generate a short") ? "feat/safe-commit" : "feat: commit changes",
      git: async (args) => {
        const command = args.join(" ");
        if (command === "branch --show-current") return ok("main");
        if (command === "status --porcelain") return ok("M  staged.ts");
        if (command === "diff --cached --name-only") return ok("staged.ts");
        if (command === "rev-parse --short HEAD") return ok("abc123");
        if (command.startsWith("show-ref ")) return { stdout: "", stderr: "", exitCode: 1 };
        return ok();
      },
    });
    await harness.run();

    expect(harness.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Commit on main?" }),
    );
    expect(harness.calls).toContainEqual(["switch", "-c", "feat/safe-commit"]);
  });

  test("stages all unstaged and untracked changes after confirmation", async () => {
    const harness = makeHarness({
      confirms: [true],
      git: async (args) => {
        const command = args.join(" ");
        if (command === "branch --show-current") return ok("feature");
        if (command === "status --porcelain") return ok(" M changed.ts\n?? new.ts");
        if (command === "diff --cached --name-only") return ok("changed.ts\nnew.ts");
        if (command === "rev-parse --short HEAD") return ok("abc123");
        return ok();
      },
    });
    await harness.run();

    expect(harness.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Stage all changes?" }),
    );
    expect(harness.calls).toContainEqual(["add", "-A"]);
  });

  test("uses only the staged diff when staging is declined", async () => {
    let prompt = "";
    const harness = makeHarness({
      confirms: [false],
      generate: async (value) => {
        prompt = value;
        return "feat: commit changes";
      },
      git: async (args) => {
        const command = args.join(" ");
        if (command === "branch --show-current") return ok("feature");
        if (command === "status --porcelain") return ok("M  staged.ts\n M unstaged.ts");
        if (command === "diff --cached") return ok("+staged content");
        if (command === "diff --cached --name-only") return ok("staged.ts");
        if (command === "rev-parse --short HEAD") return ok("abc123");
        return ok();
      },
    });
    await harness.run();

    expect(harness.calls).not.toContainEqual(["add", "-A"]);
    expect(harness.calls).not.toContainEqual(["diff"]);
    expect(prompt).toContain("+staged content");
  });

  test("does not generate or commit when nothing is staged", async () => {
    const harness = makeHarness({
      git: async (args) => {
        if (args.join(" ") === "branch --show-current") return ok("feature");
        return ok();
      },
    });
    await harness.run();

    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.calls.some((args) => args[0] === "commit")).toBeFalse();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Nothing staged to commit",
      variant: "warning",
    });
  });

  test("passes arguments to generation and commits with an argument array", async () => {
    const harness = makeHarness();
    await harness.run("focus on the API change");

    expect(harness.generate.mock.calls[0]?.[0].prompt).toContain(
      "focus on the API change",
    );
    expect(harness.calls).toContainEqual(["commit", "-m", "feat: commit changes"]);
    expect(harness.toast).toHaveBeenCalledWith({
      message: "Committed abc123: feat: commit changes",
      variant: "success",
    });
  });

  test("reports hook stderr and resets the running guard", async () => {
    let fail = true;
    const harness = makeHarness({
      git: async (args) => {
        const command = args.join(" ");
        if (args[0] === "commit" && fail) {
          fail = false;
          return { stdout: "", stderr: "pre-commit hook rejected changes\n", exitCode: 1 };
        }
        if (command === "branch --show-current") return ok("feature");
        if (command === "status --porcelain") return ok("M  staged.ts");
        if (command === "diff --cached --name-only") return ok("staged.ts");
        if (command === "rev-parse --short HEAD") return ok("abc123");
        return ok();
      },
    });

    await harness.run();
    expect(harness.toast).toHaveBeenCalledWith({
      message: "pre-commit hook rejected changes",
      variant: "error",
    });
    await harness.run();
    expect(harness.calls.filter((args) => args[0] === "commit")).toHaveLength(2);
  });

  test("shows hook progress and allows the active commit to be stopped", async () => {
    const harness = makeHarness({
      git: async (args, _directory, signal) => {
        const command = args.join(" ");
        if (command === "branch --show-current") return ok("feature");
        if (command === "status --porcelain") return ok("M  staged.ts");
        if (command === "diff --cached --name-only") return ok("staged.ts");
        if (args[0] === "commit") {
          return new Promise<GitResult>((resolve) => {
            signal.addEventListener(
              "abort",
              () => resolve({ stdout: "", stderr: "", exitCode: 1 }),
              { once: true },
            );
          });
        }
        return ok();
      },
    });

    const pending = harness.run();
    while (!harness.calls.some((args) => args[0] === "commit")) await Promise.resolve();

    expect(harness.toast).toHaveBeenCalledWith({
      message: "Running git commit (pre-commit hooks may take a while)...",
      variant: "info",
    });
    await harness.stop();
    await pending;

    expect(harness.toast).toHaveBeenCalledWith({
      message: "Commit operation stopped",
      variant: "warning",
    });
  });
});

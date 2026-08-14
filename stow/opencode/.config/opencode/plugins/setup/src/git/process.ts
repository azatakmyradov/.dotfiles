export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type ProcessRunner = (
  args: readonly string[],
  directory: string,
  signal: AbortSignal,
) => Promise<ProcessResult>;

async function spawn(
  command: "git" | "gh",
  args: readonly string[],
  directory: string,
  signal: AbortSignal,
): Promise<ProcessResult> {
  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn([command, ...args], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`${command} is not installed or not available in PATH${detail}`);
  }

  const abort = () => child.kill();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  try {
    const stdoutStream = child.stdout as ReadableStream<Uint8Array>;
    const stderrStream = child.stderr as ReadableStream<Uint8Array>;
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(stdoutStream).text(),
      new Response(stderrStream).text(),
      child.exited,
    ]);
    return { stdout, stderr, exitCode };
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export const spawnGit: ProcessRunner = (args, directory, signal) =>
  spawn("git", args, directory, signal);

export const spawnGh: ProcessRunner = (args, directory, signal) =>
  spawn("gh", args, directory, signal);

export function processError(
  command: "git" | "gh",
  args: readonly string[],
  result: ProcessResult,
): Error {
  const detail = result.stderr.trim() || result.stdout.trim();
  return new Error(
    detail || `${command} ${args.join(" ")} failed with exit code ${result.exitCode}`,
  );
}

export async function runProcess(
  command: "git" | "gh",
  runner: ProcessRunner,
  args: readonly string[],
  directory: string,
  signal: AbortSignal,
): Promise<string> {
  const result = await runner(args, directory, signal);
  if (result.exitCode !== 0) throw processError(command, args, result);
  return result.stdout.trim();
}

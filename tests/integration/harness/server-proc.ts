import { spawn, type ChildProcess } from 'node:child_process';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { probeFreePort } from './ports.js';
import { awaitCondition, type WaitOptions } from './wait.js';

/** Repo root: this file is at tests/integration/harness/. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ENTRYPOINT = 'src/server.ts';
const START_TIMEOUT_MS = 15_000;
/** How long SIGTERM gets before the SIGKILL escape hatch. */
const STOP_TIMEOUT_MS = 5_000;

export interface ServerProcOptions {
  /**
   * Applied over the parent environment. An explicit `undefined` *unsets* the
   * variable, which is how a test selects the deployment that forgot to set
   * one — inheriting an ambient `SLACK_SIGNING_SECRET` would silently turn
   * test 8 into a different test.
   */
  env: Record<string, string | undefined>;
  /**
   * Pin the port instead of probing for one. Slice 5 restarts on the same port
   * deliberately. `env.PORT` is overwritten either way: the harness cannot ask
   * the child which port it took, so it must be the one that decides.
   */
  port?: number;
}

export interface ServerProc {
  readonly port: number;
  readonly baseUrl: string;
  /** Captured lines. The entrypoint reports its configuration here. */
  readonly stdout: readonly string[];
  readonly stderr: readonly string[];
  /** `null` until the child exits; `0` after a clean SIGTERM shutdown. */
  readonly exitCode: number | null;
  /**
   * Wait for a stdout line containing `match`. `startServerProc` resolves on
   * the "listening" line, which is liveness and not the end of the startup
   * banner: the configuration lines after it may not have been flushed yet,
   * and reading the array directly is a race that passes on a quiet machine.
   */
  awaitStdout(match: string, opts?: WaitOptions): Promise<string>;
  /** SIGTERM, await exit, with a SIGKILL escape hatch on deadline. */
  stop(): Promise<void>;
}

/** Thrown when the child died before listening because the port was taken. */
class AddressInUseError extends Error {}

/**
 * Every child ever spawned that has not exited. A test that fails before its
 * `afterEach` runs would otherwise leave a `tsx` process holding a port for
 * the rest of the session.
 */
const live = new Set<ChildProcess>();
let cleanupRegistered = false;

function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.on('exit', () => {
    for (const child of live) child.kill('SIGKILL');
  });
}

function collect(stream: Readable, into: string[]): void {
  let partial = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    partial += chunk;
    const lines = partial.split('\n');
    partial = lines.pop() ?? '';
    into.push(...lines);
  });
  stream.on('end', () => {
    if (partial) into.push(partial);
  });
}

function buildEnv(overrides: Record<string, string | undefined>, port: number): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  env.PORT = String(port);
  return env;
}

async function attempt(port: number, env: NodeJS.ProcessEnv): Promise<ServerProc> {
  // `node --import tsx` rather than the `tsx` bin: no shell, no guessing at a
  // path under node_modules/.bin, and the same interpreter vitest runs under.
  const child = spawn(process.execPath, ['--import', 'tsx', ENTRYPOINT], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  live.add(child);

  const stdout: string[] = [];
  const stderr: string[] = [];
  if (!child.stdout || !child.stderr) throw new Error('server proc: no stdio pipes');
  collect(child.stdout, stdout);
  collect(child.stderr, stderr);

  let exitCode: number | null = null;
  let exited = false;
  const hasExited = new Promise<void>((resolve) => {
    child.once('exit', (code) => {
      exitCode = code;
      exited = true;
      live.delete(child);
      resolve();
    });
  });

  const kill = async (): Promise<void> => {
    if (exited) return;
    child.kill('SIGKILL');
    await hasExited;
  };

  // The entrypoint logs the *configured* port, so this marker is only proof of
  // liveness because the harness chose the port it is looking for.
  const marker = `purview listening on :${port}`;
  try {
    await awaitCondition(
      () => stdout.some((line) => line.includes(marker)) || exited || undefined,
      {
        timeoutMs: START_TIMEOUT_MS,
        label: `the entrypoint to log "${marker}"`,
      },
    );
  } catch (err) {
    await kill();
    throw new Error(`${(err as Error).message}\nstderr:\n${stderr.join('\n')}`, { cause: err });
  }

  if (exited) {
    const detail = stderr.join('\n');
    if (detail.includes('EADDRINUSE')) throw new AddressInUseError(detail);
    throw new Error(
      `the entrypoint exited with code ${String(exitCode)} before listening:\n${detail}`,
    );
  }

  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    stdout,
    stderr,
    get exitCode() {
      return exitCode;
    },
    awaitStdout: (match, opts) =>
      awaitCondition(() => stdout.find((line) => line.includes(match)), {
        label: `a stdout line containing "${match}"`,
        ...opts,
      }),
    async stop(): Promise<void> {
      if (exited) return;
      child.kill('SIGTERM');
      const escapeHatch = setTimeout(() => child.kill('SIGKILL'), STOP_TIMEOUT_MS);
      escapeHatch.unref();
      await hasExited;
      clearTimeout(escapeHatch);
    },
  };
}

/**
 * Spawns the real entrypoint under `tsx`, resolving when it logs that it is
 * listening.
 *
 * Retries once on `EADDRINUSE` (gate 2 risk 2): `probeFreePort` closes the
 * listener before handing the port over, so the port is free when returned and
 * not when used. One retry, and only for a port this function chose — a
 * caller-pinned port that is taken is a real failure, not a race.
 */
export async function startServerProc(opts: ServerProcOptions): Promise<ServerProc> {
  registerCleanup();
  const port = opts.port ?? (await probeFreePort());
  try {
    return await attempt(port, buildEnv(opts.env, port));
  } catch (err) {
    if (opts.port !== undefined || !(err instanceof AddressInUseError)) throw err;
    const retryPort = await probeFreePort();
    return attempt(retryPort, buildEnv(opts.env, retryPort));
  }
}

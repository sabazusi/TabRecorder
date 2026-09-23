import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { WindowBounds } from "../window/iphoneMirroringWindow.ts";

export type NativeClickEvent = {
  x: number;
  y: number;
  timestamp: number;
};

export type CaptureSession = {
  events: AsyncIterable<NativeClickEvent>;
  stop: () => void;
};

export interface NativeController {
  getIPhoneMirroringWindow(): Promise<WindowBounds>;
  startMouseCapture(signal?: AbortSignal): CaptureSession;
  createClickStream(): MouseController;
}

export interface MouseController {
  click(x: number, y: number): Promise<void>;
  close(): Promise<void>;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packagePath = join(projectRoot, "native/tab-recorder-helper");
const releaseBinary = join(packagePath, ".build/release/tab-recorder-helper");

function helperCommand(args: string[]): { command: string; args: string[] } {
  if (process.env.TAB_RECORDER_HELPER) {
    return { command: process.env.TAB_RECORDER_HELPER, args };
  }
  return { command: releaseBinary, args };
}

function spawnHelper(args: string[]): ChildProcessWithoutNullStreams {
  const command = helperCommand(args);
  return spawn(command.command, command.args, {
    stdio: ["pipe", "pipe", "pipe"]
  });
}

async function collectHelperOutput(args: string[]): Promise<string> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawnHelper(args);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("Native helper was not found. Run `npm run build:native` first."));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(stdout.trim());
        return;
      }
      reject(new Error(stderr.trim() || `Native helper exited with code ${code}.`));
    });
  });
}

export class SwiftNativeController implements NativeController {
  async getIPhoneMirroringWindow(): Promise<WindowBounds> {
    const output = await collectHelperOutput(["window"]);
    const value = JSON.parse(output) as WindowBounds | null;
    if (!value) {
      throw new Error("iPhone Mirroring window was not found.\nOpen iPhone Mirroring and try again.");
    }
    return value;
  }

  startMouseCapture(signal?: AbortSignal): CaptureSession {
    const child = spawnHelper(["capture"]);
    const lineReader = createInterface({ input: child.stdout });
    const pending: NativeClickEvent[] = [];
    const waiters: Array<(value: IteratorResult<NativeClickEvent>) => void> = [];
    let done = false;
    let stderr = "";

    const emit = (event: NativeClickEvent) => {
      const waiter = waiters.shift();
      if (waiter) {
        waiter({ value: event, done: false });
      } else {
        pending.push(event);
      }
    };

    const finish = () => {
      done = true;
      for (const waiter of waiters.splice(0)) {
        waiter({ value: undefined, done: true });
      }
    };

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.includes("permission")) {
        process.stderr.write(stderr);
      }
    });
    child.on("close", finish);
    child.on("error", finish);
    lineReader.on("line", (line) => {
      try {
        emit(JSON.parse(line) as NativeClickEvent);
      } catch {
        process.stderr.write(`Ignoring malformed helper output: ${line}\n`);
      }
    });

    const stop = () => {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      finish();
    };
    signal?.addEventListener("abort", stop, { once: true });

    return {
      stop,
      events: {
        [Symbol.asyncIterator]() {
          return {
            next: async () => {
              if (pending.length > 0) {
                return { value: pending.shift()!, done: false };
              }
              if (done) {
                return { value: undefined, done: true };
              }
              return await new Promise<IteratorResult<NativeClickEvent>>((resolveNext) => {
                waiters.push(resolveNext);
              });
            }
          };
        }
      }
    };
  }

  createClickStream(): MouseController {
    const child = spawnHelper(["click-stream"]);
    const lineReader = createInterface({ input: child.stdout });
    const pendingClicks: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    let closed = false;
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      closed = true;
      const error = new Error(stderr.trim() || `Native helper click stream exited with code ${code}.`);
      for (const pending of pendingClicks.splice(0)) {
        pending.reject(error);
      }
    });
    lineReader.on("line", () => {
      pendingClicks.shift()?.resolve();
    });

    return {
      click: async (x: number, y: number) => {
        if (closed || !child.stdin.writable) {
          throw new Error("Native helper click stream is not available.");
        }
        await new Promise<void>((resolveClick, reject) => {
          pendingClicks.push({ resolve: resolveClick, reject });
          child.stdin.write(`${Math.round(x)} ${Math.round(y)}\n`);
        });
      },
      close: async () => {
        child.stdin.end();
        if (!closed) {
          child.kill("SIGTERM");
        }
      }
    };
  }
}

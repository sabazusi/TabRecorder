import { SwiftNativeController } from "../native/nativeController.ts";
import { playScenario } from "../player/player.ts";
import { loadScenario } from "../scenario/loadScenario.ts";

export async function runPlay(args: string[]): Promise<void> {
  const file = args[0];
  if (!file) {
    throw new Error("Usage: tab-recorder play <scenario.json> [--loop] [--loop-interval ms] [--count n] [--speed n]");
  }

  const options = parsePlayOptions(args.slice(1));
  const abortController = new AbortController();
  process.once("SIGINT", () => {
    abortController.abort();
    process.stdout.write("\nStopping playback...\n");
  });

  const scenario = await loadScenario(file);
  await playScenario(scenario, new SwiftNativeController(), {
    ...options,
    signal: abortController.signal
  });
}

export function parsePlayOptions(args: string[]): { loop: boolean; loopInterval: number; count?: number; speed: number } {
  let loop = false;
  let loopInterval = 0;
  let count: number | undefined;
  let speed = 1;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--loop":
        loop = true;
        break;
      case "--loop-interval":
        loopInterval = parseNonNegativeInteger(args[++index], "--loop-interval");
        break;
      case "--count":
        count = parsePositiveInteger(args[++index], "--count");
        break;
      case "--speed":
        speed = parsePositiveNumber(args[++index], "--speed");
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (loop && count !== undefined) {
    throw new Error("Use either --loop or --count, not both.");
  }

  return { loop, loopInterval, count, speed };
}

function parseNonNegativeInteger(value: string | undefined, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be an integer greater than or equal to 0.`);
  }
  return parsed;
}

function parsePositiveInteger(value: string | undefined, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${option} must be an integer greater than or equal to 1.`);
  }
  return parsed;
}

function parsePositiveNumber(value: string | undefined, option: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} must be greater than 0.`);
  }
  return parsed;
}

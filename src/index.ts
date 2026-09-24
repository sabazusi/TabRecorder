#!/usr/bin/env -S node --experimental-strip-types
import { runPlay } from "./cli/play.ts";
import { runRecord } from "./cli/record.ts";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "record":
      await runRecord(args);
      return;
    case "play":
      await runPlay(args);
      return;
    default:
      console.log("Usage:");
      console.log("  tab-recorder record <name>");
      console.log("  tab-recorder play <scenario.json> [--loop] [--loop-interval ms] [--count n] [--speed n]");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

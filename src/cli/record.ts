import { SwiftNativeController } from "../native/nativeController.ts";
import { recordScenario } from "../recorder/recorder.ts";

export async function runRecord(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    throw new Error("Usage: tab-recorder record <name>");
  }

  const abortController = new AbortController();
  process.once("SIGINT", () => {
    abortController.abort();
    process.stdout.write("\nStopping recording...\n");
  });

  const path = await recordScenario(name, new SwiftNativeController(), abortController.signal);
  console.log("");
  console.log(`Saved to ${path}`);
}

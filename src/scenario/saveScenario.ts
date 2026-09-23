import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Scenario } from "./schema.ts";

export async function saveScenario(path: string, scenario: Scenario): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
}

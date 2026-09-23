import { readFile } from "node:fs/promises";
import { validateScenario, type Scenario } from "./schema.ts";

export async function loadScenario(path: string): Promise<Scenario> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Scenario file was not found:\n${path}`);
    }
    throw error;
  }

  try {
    return validateScenario(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid scenario file.");
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

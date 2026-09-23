import assert from "node:assert/strict";
import test from "node:test";
import { executeStep } from "../src/player/executeStep.ts";
import type { MouseController } from "../src/native/nativeController.ts";

test("executeStep repeatTap clicks the requested number of times", async () => {
  const clicks: Array<{ x: number; y: number }> = [];
  const mouse: MouseController = {
    click: async (x, y) => {
      clicks.push({ x, y });
    },
    close: async () => {}
  };

  await executeStep(
    { type: "repeatTap", x: 0.5, y: 0.5, count: 3, interval: 0, delayAfter: 0 },
    { x: 100, y: 200, width: 300, height: 400 },
    mouse,
    { speed: 1, signal: new AbortController().signal }
  );

  assert.deepEqual(clicks, [
    { x: 250, y: 400 },
    { x: 250, y: 400 },
    { x: 250, y: 400 }
  ]);
});

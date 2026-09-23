import assert from "node:assert/strict";
import test from "node:test";
import { buildTapStepsFromEvents } from "../src/recorder/recorder.ts";

test("buildTapStepsFromEvents filters outside clicks and computes delayAfter", () => {
  const steps = buildTapStepsFromEvents(
    [
      { x: 10, y: 10, timestamp: 1000 },
      { x: 700, y: 680, timestamp: 2000 },
      { x: 700, y: 680, timestamp: 2842 }
    ],
    { x: 500, y: 200, width: 400, height: 800 }
  );

  assert.deepEqual(steps, [
    { type: "tap", x: 0.5, y: 0.6, delayAfter: 842 },
    { type: "tap", x: 0.5, y: 0.6, delayAfter: 0 }
  ]);
});

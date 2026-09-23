import assert from "node:assert/strict";
import test from "node:test";
import { validateScenario } from "../src/scenario/schema.ts";

test("validateScenario accepts tap, repeatTap, and wait steps", () => {
  const scenario = validateScenario({
    version: 1,
    name: "example",
    steps: [
      { type: "tap", x: 0.5, y: 0.6, delayAfter: 500 },
      { type: "repeatTap", x: 0.5, y: 0.6, count: 2, interval: 80, delayAfter: 100 },
      { type: "wait", duration: 200 }
    ]
  });

  assert.equal(scenario.steps.length, 3);
});

test("validateScenario rejects out-of-range coordinates", () => {
  assert.throws(
    () =>
      validateScenario({
        version: 1,
        name: "bad",
        steps: [{ type: "tap", x: 1.1, y: 0.5, delayAfter: 0 }]
      }),
    /between 0 and 1/
  );
});

test("validateScenario rejects invalid repeatTap count", () => {
  assert.throws(
    () =>
      validateScenario({
        version: 1,
        name: "bad",
        steps: [{ type: "repeatTap", x: 0.5, y: 0.5, count: 0, interval: 80, delayAfter: 0 }]
      }),
    /count/
  );
});

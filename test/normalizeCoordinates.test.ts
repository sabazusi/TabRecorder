import assert from "node:assert/strict";
import test from "node:test";
import { absoluteToRelative, relativeToAbsolute } from "../src/recorder/normalizeCoordinates.ts";

const window = { x: 500, y: 200, width: 400, height: 800 };

test("absoluteToRelative converts window coordinates to unit coordinates", () => {
  assert.deepEqual(absoluteToRelative({ x: 700, y: 680 }, window), { x: 0.5, y: 0.6 });
});

test("relativeToAbsolute converts unit coordinates to window coordinates", () => {
  assert.deepEqual(relativeToAbsolute({ x: 0.5, y: 0.6 }, window), { x: 700, y: 680 });
});

test("coordinate conversion supports insets", () => {
  const insets = { top: 10, right: 20, bottom: 30, left: 40 };
  assert.deepEqual(relativeToAbsolute({ x: 0, y: 0 }, window, insets), { x: 540, y: 210 });
});

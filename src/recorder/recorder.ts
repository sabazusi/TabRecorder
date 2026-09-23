import { basename, join } from "node:path";
import type { NativeClickEvent, NativeController } from "../native/nativeController.ts";
import { saveScenario } from "../scenario/saveScenario.ts";
import type { Scenario, TapStep } from "../scenario/schema.ts";
import { isInsideWindow, type WindowBounds } from "../window/iphoneMirroringWindow.ts";
import { absoluteToRelative } from "./normalizeCoordinates.ts";

type TimedTapStep = TapStep & { timestamp: number };

export function buildTapStepsFromEvents(events: NativeClickEvent[], window: WindowBounds): TapStep[] {
  const steps: TimedTapStep[] = [];

  for (const event of events) {
    if (!isInsideWindow(event, window)) {
      continue;
    }
    if (steps.length > 0) {
      const previous = steps[steps.length - 1]!;
      previous.delayAfter = Math.max(0, event.timestamp - previous.timestamp);
    }
    const relative = absoluteToRelative(event, window);
    steps.push({
      type: "tap",
      x: roundCoordinate(relative.x),
      y: roundCoordinate(relative.y),
      delayAfter: 0,
      timestamp: event.timestamp
    });
  }

  return steps.map(({ timestamp: _timestamp, ...step }) => step);
}

export async function recordScenario(name: string, native: NativeController, signal: AbortSignal): Promise<string> {
  const window = await native.getIPhoneMirroringWindow();
  console.log("iPhone Mirroring window detected.");
  console.log("");
  console.log("Recording started.");
  console.log("Press Ctrl+C to stop.");
  console.log("");

  const capture = native.startMouseCapture(signal);
  const steps: TimedTapStep[] = [];
  let index = 0;

  try {
    for await (const event of capture.events) {
      if (signal.aborted) {
        break;
      }
      if (!isInsideWindow(event, window)) {
        continue;
      }

      let delayFromPrevious = 0;
      if (steps.length > 0) {
        const previous = steps[steps.length - 1]!;
        delayFromPrevious = Math.max(0, event.timestamp - previous.timestamp);
        previous.delayAfter = delayFromPrevious;
      }

      const relative = absoluteToRelative(event, window);
      const step: TimedTapStep = {
        type: "tap",
        x: roundCoordinate(relative.x),
        y: roundCoordinate(relative.y),
        delayAfter: 0,
        timestamp: event.timestamp
      };
      steps.push(step);
      index += 1;
      console.log(`[${index}] tap x=${step.x.toFixed(3)} y=${step.y.toFixed(3)} +${delayFromPrevious}ms`);
    }
  } finally {
    capture.stop();
  }

  const scenario: Scenario = {
    version: 1,
    name,
    steps: steps.map(({ timestamp: _timestamp, ...step }) => step)
  };
  const path = join("scenarios", `${basename(name, ".json")}.json`);
  await saveScenario(path, scenario);
  return path;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

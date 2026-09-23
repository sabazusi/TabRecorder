import type { MouseController } from "../native/nativeController.ts";
import type { ScenarioStep } from "../scenario/schema.ts";
import type { WindowBounds } from "../window/iphoneMirroringWindow.ts";
import { relativeToAbsolute } from "../recorder/normalizeCoordinates.ts";

export async function executeStep(
  step: ScenarioStep,
  window: WindowBounds,
  mouse: MouseController,
  options: { speed: number; signal: AbortSignal }
): Promise<void> {
  switch (step.type) {
    case "tap": {
      const absolute = relativeToAbsolute(step, window);
      await mouse.click(absolute.x, absolute.y);
      await sleepScaled(step.delayAfter, options.speed, options.signal);
      return;
    }
    case "repeatTap": {
      const absolute = relativeToAbsolute(step, window);
      for (let i = 0; i < step.count; i += 1) {
        throwIfAborted(options.signal);
        await mouse.click(absolute.x, absolute.y);
        if (i < step.count - 1) {
          await sleepScaled(step.interval, options.speed, options.signal);
        }
      }
      await sleepScaled(step.delayAfter, options.speed, options.signal);
      return;
    }
    case "wait":
      await sleepScaled(step.duration, options.speed, options.signal);
      return;
  }
}

export async function sleepScaled(durationMs: number, speed: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  const scaled = Math.max(0, Math.round(durationMs / speed));
  if (scaled === 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, scaled);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new Error("Interrupted."));
      },
      { once: true }
    );
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Interrupted.");
  }
}

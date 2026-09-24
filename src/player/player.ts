import type { NativeController } from "../native/nativeController.ts";
import type { Scenario, ScenarioStep } from "../scenario/schema.ts";
import { executeStep, sleepScaled } from "./executeStep.ts";

export type PlayOptions = {
  loop: boolean;
  loopInterval: number;
  count?: number;
  speed: number;
  signal: AbortSignal;
};

export async function playScenario(
  scenario: Scenario,
  native: NativeController,
  options: PlayOptions
): Promise<void> {
  const window = await native.getIPhoneMirroringWindow();
  const mouse = native.createClickStream();

  try {
    console.log(`Scenario: ${scenario.name}`);
    console.log("");
    await countdown(options.signal);

    let loopIndex = 0;
    while (!options.signal.aborted) {
      loopIndex += 1;
      if (options.loop || (options.count ?? 1) > 1) {
        console.log(`Loop #${loopIndex}`);
      }

      await playOnce(scenario, window, mouse, options);

      const hasNextLoop = options.loop || loopIndex < (options.count ?? 1);
      if (options.signal.aborted || !hasNextLoop) {
        break;
      }

      if (options.loopInterval > 0) {
        console.log(`Waiting ${options.loopInterval}ms before the next loop...`);
        await sleepScaled(options.loopInterval, 1, options.signal);
      }
    }
  } finally {
    await mouse.close();
  }
}

async function countdown(signal: AbortSignal): Promise<void> {
  console.log("Playback starts in:");
  console.log("");
  for (const value of [3, 2, 1]) {
    console.log(String(value));
    await sleepScaled(1000, 1, signal);
  }
  console.log("");
}

async function playOnce(
  scenario: Scenario,
  window: Parameters<typeof executeStep>[1],
  mouse: Parameters<typeof executeStep>[2],
  options: PlayOptions
): Promise<void> {
  for (const [index, step] of scenario.steps.entries()) {
    if (options.signal.aborted) {
      break;
    }
    console.log(formatStepLog(index + 1, scenario.steps.length, step));
    await executeStep(step, window, mouse, { speed: options.speed, signal: options.signal });
  }
}

function formatStepLog(index: number, total: number, step: ScenarioStep): string {
  switch (step.type) {
    case "tap":
      return `[${index}/${total}] tap       x=${step.x.toFixed(3)} y=${step.y.toFixed(3)}`;
    case "repeatTap":
      return `[${index}/${total}] repeatTap x=${step.x.toFixed(3)} y=${step.y.toFixed(3)} count=${step.count} interval=${step.interval}ms`;
    case "wait":
      return `[${index}/${total}] wait      ${step.duration}ms`;
  }
}

export type TapStep = {
  type: "tap";
  x: number;
  y: number;
  delayAfter: number;
};

export type RepeatTapStep = {
  type: "repeatTap";
  x: number;
  y: number;
  count: number;
  interval: number;
  delayAfter: number;
};

export type WaitStep = {
  type: "wait";
  duration: number;
};

export type ScenarioStep = TapStep | RepeatTapStep | WaitStep;

export type Scenario = {
  version: 1;
  name: string;
  steps: ScenarioStep[];
};

export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ScenarioValidationError(`${path} must be a finite number.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  const numberValue = requireFiniteNumber(value, path);
  if (!Number.isInteger(numberValue)) {
    throw new ScenarioValidationError(`${path} must be an integer.`);
  }
  return numberValue;
}

function validateUnitCoordinate(value: unknown, path: string): number {
  const numberValue = requireFiniteNumber(value, path);
  if (numberValue < 0 || numberValue > 1) {
    throw new ScenarioValidationError(`${path} must be between 0 and 1.`);
  }
  return numberValue;
}

function validateNonNegative(value: unknown, path: string): number {
  const numberValue = requireFiniteNumber(value, path);
  if (numberValue < 0) {
    throw new ScenarioValidationError(`${path} must be greater than or equal to 0.`);
  }
  return numberValue;
}

function validateStep(value: unknown, index: number): ScenarioStep {
  const path = `steps[${index}]`;
  if (!isRecord(value)) {
    throw new ScenarioValidationError(`${path} must be an object.`);
  }

  switch (value.type) {
    case "tap":
      return {
        type: "tap",
        x: validateUnitCoordinate(value.x, `${path}.x`),
        y: validateUnitCoordinate(value.y, `${path}.y`),
        delayAfter: validateNonNegative(value.delayAfter, `${path}.delayAfter`)
      };
    case "repeatTap": {
      const count = requireInteger(value.count, `${path}.count`);
      if (count < 1) {
        throw new ScenarioValidationError(`${path}.count must be greater than or equal to 1.`);
      }
      return {
        type: "repeatTap",
        x: validateUnitCoordinate(value.x, `${path}.x`),
        y: validateUnitCoordinate(value.y, `${path}.y`),
        count,
        interval: validateNonNegative(value.interval, `${path}.interval`),
        delayAfter: validateNonNegative(value.delayAfter, `${path}.delayAfter`)
      };
    }
    case "wait":
      return {
        type: "wait",
        duration: validateNonNegative(value.duration, `${path}.duration`)
      };
    default:
      throw new ScenarioValidationError(`${path}.type is unsupported.`);
  }
}

export function validateScenario(value: unknown): Scenario {
  if (!isRecord(value)) {
    throw new ScenarioValidationError("Scenario must be an object.");
  }
  if (value.version !== 1) {
    throw new ScenarioValidationError("Scenario version must be 1.");
  }
  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new ScenarioValidationError("Scenario name must be a non-empty string.");
  }
  if (!Array.isArray(value.steps)) {
    throw new ScenarioValidationError("Scenario steps must be an array.");
  }

  return {
    version: 1,
    name: value.name,
    steps: value.steps.map((step, index) => validateStep(step, index))
  };
}

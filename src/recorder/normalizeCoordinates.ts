import type { WindowBounds } from "../window/iphoneMirroringWindow.ts";

export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const zeroInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function activeBounds(window: WindowBounds, insets: Insets): WindowBounds {
  return {
    x: window.x + insets.left,
    y: window.y + insets.top,
    width: window.width - insets.left - insets.right,
    height: window.height - insets.top - insets.bottom
  };
}

export function absoluteToRelative(
  point: { x: number; y: number },
  window: WindowBounds,
  insets: Insets = zeroInsets
): { x: number; y: number } {
  const bounds = activeBounds(window, insets);
  return {
    x: (point.x - bounds.x) / bounds.width,
    y: (point.y - bounds.y) / bounds.height
  };
}

export function relativeToAbsolute(
  point: { x: number; y: number },
  window: WindowBounds,
  insets: Insets = zeroInsets
): { x: number; y: number } {
  const bounds = activeBounds(window, insets);
  return {
    x: bounds.x + bounds.width * point.x,
    y: bounds.y + bounds.height * point.y
  };
}

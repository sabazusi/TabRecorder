export type WindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function isInsideWindow(point: { x: number; y: number }, window: WindowBounds): boolean {
  return (
    point.x >= window.x &&
    point.x <= window.x + window.width &&
    point.y >= window.y &&
    point.y <= window.y + window.height
  );
}

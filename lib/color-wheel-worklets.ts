/** Worklet-safe helpers for color wheel gesture math (UI thread). */

export function clampWorklet(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function pointToWheelHueWorklet(dx: number, dy: number): number {
  'worklet';
  const radians = Math.atan2(dy, dx);
  const hue = (radians * 180) / Math.PI + 90;
  return ((hue % 360) + 360) % 360;
}

export function hueSatToXYWorklet(
  h: number,
  s: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number
) {
  'worklet';
  const radius =
    innerRadius +
    (clampWorklet(s, 0, 100) / 100) * (outerRadius - innerRadius);
  const angle = ((h - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function touchToHueSatWorklet(
  x: number,
  y: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number
): { h: number; s: number } | null {
  'worklet';
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < innerRadius * 0.85 || distance > outerRadius * 1.08) {
    return null;
  }

  const hue = pointToWheelHueWorklet(dx, dy);
  const saturation = clampWorklet(
    ((distance - innerRadius) / (outerRadius - innerRadius)) * 100,
    0,
    100
  );

  return { h: hue, s: saturation };
}

export function lightnessFromTouchYWorklet(
  locationY: number,
  trackHeight: number,
  thumbSize: number
): number {
  'worklet';
  const usable = Math.max(trackHeight - thumbSize, 1);
  const adjustedY = clampWorklet(locationY - thumbSize / 2, 0, usable);
  return clampWorklet(100 - (adjustedY / usable) * 100, 0, 100);
}

export function thumbTopFromLightnessWorklet(
  lightness: number,
  trackHeight: number,
  thumbSize: number
): number {
  'worklet';
  const usable = Math.max(trackHeight - thumbSize, 1);
  return ((100 - clampWorklet(lightness, 0, 100)) / 100) * usable;
}

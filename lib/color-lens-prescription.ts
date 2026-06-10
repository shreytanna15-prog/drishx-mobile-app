import type { ColorLensTypeId } from '@/lib/color-lens';

export type EyePowerValues = {
  sph: number;
  cyl: number;
  axis: number;
  add: number;
};

export type ColorLensPrescription = {
  right: EyePowerValues;
  left: EyePowerValues;
};

const POWER_STEP = 0.25;

export const DEFAULT_EYE_POWER: EyePowerValues = {
  sph: -2,
  cyl: -0.75,
  axis: 180,
  add: 1,
};

export const PRESCRIPTION_LIMITS = {
  sph: { min: -10, max: 6, step: POWER_STEP },
  cyl: { min: -6, max: 0, step: POWER_STEP },
  axis: { min: 1, max: 180, step: 1 },
  add: { min: 0.75, max: 3.5, step: POWER_STEP },
};

export function createDefaultPrescription(): ColorLensPrescription {
  return {
    right: { ...DEFAULT_EYE_POWER },
    left: { ...DEFAULT_EYE_POWER },
  };
}

export function lensTypeShowsAdd(lensType: ColorLensTypeId | string | undefined): boolean {
  return lensType === 'progressive' || lensType === 'kryptok';
}

function roundStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stepEyePower(
  field: keyof EyePowerValues,
  current: number,
  direction: 1 | -1
): number {
  const limits = PRESCRIPTION_LIMITS[field];
  const next = roundStep(current + direction * limits.step, limits.step);
  return clampValue(next, limits.min, limits.max);
}

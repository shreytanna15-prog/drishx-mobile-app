import type { LensItem, SelectableRange } from '@/lib/types/lens';

const POWER_STEP = 0.25;

function roundQuarter(value: number): number {
  return Math.round(value / POWER_STEP) * POWER_STEP;
}

/** Build options from least-negative (e.g. 0) down to most-negative (e.g. -6). */
export function generatePowerOptions(leastNegative: number, mostNegative: number): number[] {
  const start = roundQuarter(leastNegative);
  const end = roundQuarter(mostNegative);
  const options: number[] = [];

  let current = start;
  while (current >= end - POWER_STEP / 2) {
    options.push(roundQuarter(current));
    if (current <= end + POWER_STEP / 2) break;
    current = roundQuarter(current - POWER_STEP);
  }

  return options;
}

/** API range when present; otherwise 0 → product max in 0.25 steps. */
export function resolveSelectableRange(item: LensItem): SelectableRange {
  if (item.selectableRange?.sph.options.length) {
    return item.selectableRange;
  }

  const sphMin = 0;
  const sphMax = roundQuarter(item.sph);
  const sphOptions = generatePowerOptions(sphMin, sphMax);

  if (item.cyl != null) {
    const cylMax = roundQuarter(item.cyl);
    const cylOptions = generatePowerOptions(0, cylMax);
    return {
      sph: { min: sphMin, max: sphMax, options: sphOptions },
      cyl: { min: 0, max: cylMax, options: cylOptions },
    };
  }

  return {
    sph: { min: sphMin, max: sphMax, options: sphOptions },
    cyl: null,
  };
}

export const CROSS_MIN_GAP = 0.25;
const POWER_STEP = 0.25;
const POWER_EPS = 1e-9;

function toPower(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundQuarter(value: number): number {
  return Math.round(value / POWER_STEP) * POWER_STEP;
}

function generatePowerOptions(from: number, to: number): number[] {
  const a = roundQuarter(from);
  const b = roundQuarter(to);
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const options: number[] = [];

  const isNegativeRange = high <= 0 || (low < 0 && high > 0);

  if (isNegativeRange) {
    let current = high;
    while (current >= low - POWER_STEP / 2) {
      options.push(roundQuarter(current));
      if (current <= low + POWER_STEP / 2) {
        break;
      }
      current = roundQuarter(current - POWER_STEP);
    }
    return options;
  }

  let current = low;
  while (current <= high + POWER_STEP / 2) {
    options.push(roundQuarter(current));
    if (current >= high - POWER_STEP / 2) {
      break;
    }
    current = roundQuarter(current + POWER_STEP);
  }
  return options;
}

export type CrossPowerRangeMeta = {
  maxCyl: number;
};

export function hasCrossPower(item: { crossPower?: unknown | null }): boolean {
  const crossPower = toPower(item.crossPower);
  return crossPower !== null && Math.abs(crossPower) > POWER_EPS;
}

export function resolveCrossPowerMeta(item: {
  crossPower?: unknown | null;
  selectableRange?: { crossPower?: CrossPowerRangeMeta | null } | null;
}): CrossPowerRangeMeta | null {
  if (item.selectableRange?.crossPower) {
    return item.selectableRange.crossPower;
  }

  const maxCyl = toPower(item.crossPower);
  if (maxCyl === null || Math.abs(maxCyl) <= POWER_EPS) {
    return null;
  }

  return {
    maxCyl: roundQuarter(maxCyl),
  };
}

export function computeCrossCylOptions(maxCyl: number): number[] {
  const cylMax = roundQuarter(maxCyl);
  if (cylMax >= -POWER_EPS) {
    return [];
  }
  return generatePowerOptions(-CROSS_MIN_GAP, cylMax);
}

/** Cross products always use positive SPH: +0.25 up to (|CYL| − 0.25). */
export function computeCrossSphOptions(selectedCyl: number): number[] {
  const cyl = roundQuarter(selectedCyl);
  if (cyl >= -POWER_EPS) {
    return [];
  }

  const sphMax = roundQuarter(Math.abs(cyl) - CROSS_MIN_GAP);
  if (sphMax < CROSS_MIN_GAP - POWER_EPS) {
    return [];
  }
  return generatePowerOptions(CROSS_MIN_GAP, sphMax);
}

export function isAllowedCrossCombo(sph: number, cyl: number): boolean {
  const roundedSph = roundQuarter(sph);
  const roundedCyl = roundQuarter(cyl);
  const options = computeCrossSphOptions(roundedCyl);
  return options.some((value) => Math.abs(value - roundedSph) < POWER_EPS);
}

import type { LensItem, PowerAxisRange, SelectableRange } from '@/lib/types/lens';
import { resolveWholesalePowerProfile } from '@/lib/wholesale-powers';

const POWER_STEP = 0.25;

function roundQuarter(value: number): number {
  return Math.round(value / POWER_STEP) * POWER_STEP;
}

/**
 * Build scroll options between two bounds (0.25 steps).
 * Negative ranges: high → low (e.g. 0, -0.25, …, -6).
 * Positive ranges: low → high (e.g. +2, +2.25, …, +6).
 */
export function generatePowerOptions(from: number, to: number): number[] {
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

/** Ensure API-provided options follow the same scroll direction rules. */
export function orderPowerOptions(options: number[]): number[] {
  if (options.length <= 1) {
    return options;
  }
  const sorted = [...options].map(roundQuarter).sort((x, y) => x - y);
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  const isNegativeRange = high <= 0 || (low < 0 && high > 0);
  return isNegativeRange ? [...sorted].reverse() : sorted;
}

function normalizeSelectableRange(range: SelectableRange): SelectableRange {
  return {
    sph: {
      ...range.sph,
      options: orderPowerOptions(range.sph.options),
    },
    cyl: range.cyl
      ? {
          ...range.cyl,
          options: orderPowerOptions(range.cyl.options),
        }
      : null,
  };
}

/** Full CYL scroll range for a product card (0 → card max CYL in 0.25 steps). */
function resolveProductCylRange(cylMax: number): PowerAxisRange {
  const max = roundQuarter(cylMax);
  const options = generatePowerOptions(0, max);
  return { min: 0, max, options };
}

export function dropZeroFromPowerOptions(options: number[]): number[] {
  const withoutZero = options.filter((value) => Math.abs(value) > 1e-9);
  return withoutZero.length > 0 ? withoutZero : options;
}

/** Kryptok / Progressive CYL-only rows cannot use 0.00; Single Vision may include 0. */
function applyCylPickerRules(item: LensItem, cylRange: PowerAxisRange): PowerAxisRange {
  const isBifocalLens = item.lensType === 'Kryptok' || item.lensType === 'Progressive';
  if (!isBifocalLens || resolveWholesalePowerProfile(item) !== 'cyl-only') {
    return cylRange;
  }

  const options = dropZeroFromPowerOptions(cylRange.options);
  return {
    min: options[0] ?? cylRange.min,
    max: options[options.length - 1] ?? cylRange.max,
    options,
  };
}

function withCylPickerRules(item: LensItem, range: SelectableRange): SelectableRange {
  if (!range.cyl) {
    return range;
  }
  return { ...range, cyl: applyCylPickerRules(item, range.cyl) };
}

/** API range when present; otherwise 0 → product max in 0.25 steps. */
export function resolveSelectableRange(item: LensItem): SelectableRange {
  if (item.selectableRange?.sph.options.length) {
    const normalized = normalizeSelectableRange(item.selectableRange);

    // API tiers can narrow CYL to a single value for high SPH rows (e.g. -2 only).
    // Always expose the full product-card CYL range so users can scroll 0 → max CYL.
    if (item.cyl != null) {
      return withCylPickerRules(item, {
        ...normalized,
        cyl: resolveProductCylRange(item.cyl),
      });
    }

    return normalized;
  }

  const sphMin = 0;
  const sphMax = roundQuarter(item.sph);
  const sphOptions = generatePowerOptions(sphMin, sphMax);

  if (item.cyl != null) {
    return withCylPickerRules(item, {
      sph: { min: sphMin, max: sphMax, options: sphOptions },
      cyl: resolveProductCylRange(item.cyl),
    });
  }

  return {
    sph: { min: sphMin, max: sphMax, options: sphOptions },
    cyl: null,
  };
}

/** Kryptok / Progressive ADD scroll options (+1.00 → +3.00 in 0.25 steps). */
export function resolveAddOptions(item?: Pick<LensItem, 'add'> | null): number[] {
  const addMax = item?.add != null && item.add > 0 ? Math.min(3, item.add) : 3;
  return generatePowerOptions(1, addMax);
}

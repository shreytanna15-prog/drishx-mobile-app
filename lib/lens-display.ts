import { formatPowerLabel } from '@/lib/cart-utils';
import type { LensType } from '@/lib/types/lens';
import { formatProgressiveEyeLabel } from '@/lib/progressive-eye';
import { resolveWholesalePowerProfile } from '@/lib/wholesale-powers';

/** Shown when a product has no SPH/CYL (and no cross power). */
export const PLANO_POWER_LABEL = 'Plano';

function hasMeaningfulPower(value: number | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  return Math.abs(Number(value)) > 1e-9;
}

function formatLensTypeAbbrev(lensType?: LensType | string | null): string {
  switch (lensType) {
    case 'Kryptok':
      return 'KT';
    case 'Progressive':
      return 'V2';
    case 'Single Vision':
      return 'SV';
    default:
      return '';
  }
}

function formatPowerProfileLabel(
  profile: ReturnType<typeof resolveWholesalePowerProfile>
): string {
  switch (profile) {
    case 'compound':
      return 'Comp';
    case 'sph-only':
      return 'sph';
    case 'cyl-only':
      return 'cyl';
    case 'cross':
      return 'cross';
  }
}

export function formatCrossPowerLabel(crossPower: number | null | undefined): string {
  if (crossPower === null || crossPower === undefined) {
    return '—';
  }
  const value = Number(crossPower);
  if (!Number.isFinite(value)) {
    return '—';
  }
  const fixed = value.toFixed(2).replace(/\.?0+$/, '');
  return `cross ${value > 0 ? `+${fixed}` : fixed}`;
}

/** Shop / wholesale product card detail, e.g. "HC Comp KT +2.00/-1.00 x 180". */
export function formatLensProductCardDetail(item: {
  sph?: number | null;
  cyl?: number | null;
  crossPower?: number | null;
  axis?: number | null;
  coating?: string | null;
  lensType?: LensType | string | null;
  eye?: string | null;
}): string {
  const coating = item.coating?.trim() ?? '';
  const profileLabel = formatPowerProfileLabel(resolveWholesalePowerProfile(item));
  const lensAbbrev = formatLensTypeAbbrev(item.lensType);

  const powerPart =
    item.sph != null || item.cyl != null
      ? (() => {
          const sphPart = hasMeaningfulPower(item.sph) ? formatPowerLabel(item.sph!) : '—';
          const cylPart = hasMeaningfulPower(item.cyl) ? formatPowerLabel(item.cyl!) : '—';
          return sphPart === '—' && cylPart === '—'
            ? PLANO_POWER_LABEL
            : `${sphPart}/${cylPart}`;
        })()
      : hasMeaningfulPower(item.crossPower)
        ? formatCrossPowerLabel(item.crossPower)
        : PLANO_POWER_LABEL;

  const axisPart =
    item.axis !== null && item.axis !== undefined ? ` x ${formatAxisValue(item.axis)}` : '';

  const eyeLabel = formatProgressiveEyeLabel(item.eye);

  return [coating, profileLabel, lensAbbrev, `${powerPart}${axisPart}`, eyeLabel]
    .filter(Boolean)
    .join(' ');
}

export function formatAddValue(add: number | null | undefined): string {
  if (add === null || add === undefined) {
    return '—';
  }
  return formatPowerLabel(Number(add));
}

export function formatAxisValue(axis: number | null | undefined): string {
  if (axis === null || axis === undefined) {
    return '—';
  }
  return String(axis);
}

/** Compact ADD / AXIS line for shop cards and product summary. */
export function formatAddAxisLabel(item: {
  add?: number | null;
  axis?: number | null;
}): string {
  return `ADD ${formatAddValue(item.add)} · AXIS ${formatAxisValue(item.axis)}`;
}

export function formatSphCylSlash(item: {
  sph?: number | null;
  cyl?: number | null;
  crossPower?: number | null;
}): string {
  // Cart / order lines always carry the selected SPH and CYL.
  // Prefer those over catalog crossPower (max CYL).
  if (item.sph != null || item.cyl != null) {
    const hasSph = hasMeaningfulPower(item.sph);
    const hasCyl = hasMeaningfulPower(item.cyl);
    if (!hasSph && !hasCyl) {
      return PLANO_POWER_LABEL;
    }
    const sphPart = hasSph ? formatPowerLabel(Number(item.sph)) : '—';
    const cylPart = hasCyl ? formatPowerLabel(Number(item.cyl)) : '—';
    return `${sphPart}/${cylPart}`;
  }

  if (hasMeaningfulPower(item.crossPower)) {
    return formatCrossPowerLabel(item.crossPower);
  }

  return PLANO_POWER_LABEL;
}

function isSpecialColorsItem(item: string | null | undefined): boolean {
  return item?.trim().replace(/\s+/g, ' ').toLowerCase() === 'special colors';
}

/** Card label — show actual color/coating instead of the generic SPECIAL COLORS item name. */
export function formatLensItemLabel(item: {
  item?: string | null;
  coating?: string | null;
}): string {
  const itemText = item.item?.trim() ?? '';
  const coatingText = item.coating?.trim() ?? '';

  if (isSpecialColorsItem(itemText)) {
    return coatingText || 'Standard Lens';
  }

  return itemText || coatingText || 'Standard Lens';
}

/**
 * Product card title — keep a real brand when present.
 * Only replace the generic "Lens" fallback with item/category name.
 */
export function formatLensProductCardTitle(item: {
  item?: string | null;
  coating?: string | null;
  brand?: string | null;
  lensType?: string | null;
}): string {
  const brand = item.brand?.trim() ?? '';
  if (brand && brand.toLowerCase() !== 'lens') {
    return brand;
  }

  const itemText = item.item?.trim() ?? '';
  const coatingText = item.coating?.trim() ?? '';

  if (isSpecialColorsItem(itemText)) {
    return coatingText || itemText || item.lensType?.trim() || 'Product';
  }

  return itemText || coatingText || item.lensType?.trim() || 'Product';
}

/** Summary line for product detail and cart — omits redundant SPECIAL COLORS. */
export function formatLensItemCoatingSummary(item: {
  item?: string | null;
  coating?: string | null;
}): string {
  const itemText = item.item?.trim() ?? '';
  const coatingText = item.coating?.trim() ?? '';

  if (isSpecialColorsItem(itemText)) {
    return coatingText || 'Standard';
  }

  const parts = [itemText, coatingText].filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(' · ') || 'Standard';
}

export function isSameLensPower(
  a: { id?: string; sph?: number | null; cyl?: number | null; crossPower?: number | null },
  b: { id?: string; sph?: number | null; cyl?: number | null; crossPower?: number | null }
): boolean {
  if (a.id && b.id && a.id === b.id) {
    return true;
  }
  const crossA = a.crossPower ?? null;
  const crossB = b.crossPower ?? null;
  if (crossA !== null || crossB !== null) {
    return crossA === crossB;
  }
  const cylA = a.cyl ?? null;
  const cylB = b.cyl ?? null;
  return Number(a.sph) === Number(b.sph) && cylA === cylB;
}

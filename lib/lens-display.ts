import { formatPowerLabel } from '@/lib/cart-utils';
import type { LensType } from '@/lib/types/lens';
import { resolveWholesalePowerProfile } from '@/lib/wholesale-powers';

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
  }
}

/** Shop / wholesale product card detail, e.g. "HC Comp KT +2.00/-1.00 x 180". */
export function formatLensProductCardDetail(item: {
  sph: number;
  cyl?: number | null;
  axis?: number | null;
  coating?: string | null;
  lensType?: LensType | string | null;
}): string {
  const coating = item.coating?.trim() ?? '';
  const profileLabel = formatPowerProfileLabel(resolveWholesalePowerProfile(item));
  const lensAbbrev = formatLensTypeAbbrev(item.lensType);

  const sphPart = hasMeaningfulPower(item.sph) ? formatPowerLabel(item.sph) : '—';
  const cylPart = hasMeaningfulPower(item.cyl) ? formatPowerLabel(item.cyl!) : '—';
  const powerPart = `${sphPart}/${cylPart}`;

  const axisPart =
    item.axis !== null && item.axis !== undefined ? ` x ${formatAxisValue(item.axis)}` : '';

  return [coating, profileLabel, lensAbbrev, `${powerPart}${axisPart}`].filter(Boolean).join(' ');
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

export function formatSphCylSlash(item: { sph: number; cyl?: number | null }): string {
  return `${formatPowerLabel(item.sph)}/${item.cyl != null ? formatPowerLabel(item.cyl) : '—'}`;
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
  a: { id?: string; sph: number; cyl?: number | null },
  b: { id?: string; sph: number; cyl?: number | null }
): boolean {
  if (a.id && b.id && a.id === b.id) {
    return true;
  }
  const cylA = a.cyl ?? null;
  const cylB = b.cyl ?? null;
  return Number(a.sph) === Number(b.sph) && cylA === cylB;
}

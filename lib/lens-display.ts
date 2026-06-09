import { formatPowerLabel } from '@/lib/cart-utils';

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

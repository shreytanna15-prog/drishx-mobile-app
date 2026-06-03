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

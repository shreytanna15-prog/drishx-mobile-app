import type { LensItem } from '@/lib/types/lens';

export function buildCartLineId(item: Pick<LensItem, 'id' | 'sph' | 'cyl' | 'add'>): string {
  return `${item.id}:${item.sph}:${item.cyl ?? ''}:${item.add ?? ''}`;
}

export function parseNumericInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || trimmed === '+' || trimmed === '.') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Allow only signed decimal numbers while typing (e.g. -4, -2.25, 0). */
export function sanitizeSignedNumericInput(text: string): string {
  const cleaned = text.replace(/[^0-9.\-+]/g, '');
  if (cleaned === '' || cleaned === '-') {
    return cleaned;
  }

  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const parts = unsigned.split('.');
  const whole = parts[0] ?? '';
  const fraction = parts.length > 1 ? parts.slice(1).join('') : '';

  let result = negative ? '-' : '';
  result += whole;
  if (parts.length > 1) {
    result += `.${fraction}`;
  }
  return result;
}

/** Allow only positive integers for quantity. */
export function sanitizePositiveIntegerInput(text: string): string {
  return text.replace(/\D/g, '');
}

/** Allow only non-negative decimals for currency fields. */
export function sanitizePositiveDecimalInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) {
    return cleaned;
  }
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoneyInput(value: number): string {
  const rounded = roundMoney(value);
  if (!Number.isFinite(rounded)) {
    return '';
  }
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/**
 * Prescription value must be less than or equal to the lens product maximum.
 * Example: product SPH -4 → user may enter -5, -4 but not -3 or 0.
 */
export function isPrescriptionWithinMax(value: number, maxValue: number): boolean {
  return value <= maxValue;
}

export function validatePrescriptionValue(
  label: string,
  raw: string,
  maxValue: number
): string | null {
  if (!raw.trim()) {
    return `Please enter ${label}.`;
  }
  const parsed = parseNumericInput(raw);
  if (parsed === null) {
    return `Please enter a valid ${label} number.`;
  }
  if (!isPrescriptionWithinMax(parsed, maxValue)) {
    return `${label} cannot be greater than ${maxValue}. Enter ${maxValue} or a lower value.`;
  }
  return null;
}

/** Reject complete numbers that exceed the product max while still allowing partial input. */
export function canAcceptPrescriptionInput(text: string, maxValue: number): boolean {
  const parsed = parseNumericInput(text);
  if (parsed === null) {
    return true;
  }
  return isPrescriptionWithinMax(parsed, maxValue);
}

export function isPrescriptionWithinRange(value: number, minValue: number, maxValue: number): boolean {
  return value <= minValue && value >= maxValue;
}

export function validatePrescriptionInRange(
  label: string,
  raw: string,
  minValue: number,
  maxValue: number
): string | null {
  if (!raw.trim()) {
    return `Please select ${label}.`;
  }
  const parsed = parseNumericInput(raw);
  if (parsed === null) {
    return `Please enter a valid ${label} number.`;
  }
  if (!isPrescriptionWithinRange(parsed, minValue, maxValue)) {
    return `${label} must be between ${formatPowerLabel(maxValue)} and ${formatPowerLabel(minValue)}.`;
  }
  return null;
}

export function formatPowerLabel(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return '0.00';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(2)}`;
}

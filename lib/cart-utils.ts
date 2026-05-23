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

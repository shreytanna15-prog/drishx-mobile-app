import { parseNumericInput } from '@/lib/cart-utils';

export type WholesaleGridMode = 'sph-only' | 'cyl-only' | 'compound';

export type PowerRangeInput = {
  from: string;
  to: string;
  step: string;
};

export function parseStep(raw: string): number | null {
  const parsed = parseNumericInput(raw);
  if (parsed === null) return null;
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function roundPower(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildPowerList(from: number, to: number, step: number): number[] {
  const safeStep = Math.abs(step);
  const start = roundPower(Math.min(from, to));
  const end = roundPower(Math.max(from, to));

  // Guard against infinite loops / huge lists.
  const maxItems = 500;
  const out: number[] = [];
  let current = start;
  for (let i = 0; i < maxItems && current <= end + 1e-9; i += 1) {
    out.push(roundPower(current));
    current = roundPower(current + safeStep);
  }
  return out;
}

export function validateRangeInput(input: PowerRangeInput): string | null {
  const from = parseNumericInput(input.from);
  const to = parseNumericInput(input.to);
  const step = parseStep(input.step);

  if (from === null) return 'Enter a valid "From" power.';
  if (to === null) return 'Enter a valid "To" power.';
  if (step === null) return 'Enter a valid step (e.g. 0.25).';
  if (Math.abs(to - from) < 1e-9) return null;
  return null;
}

export function powerKey(value: number): string {
  return roundPower(value).toFixed(2);
}


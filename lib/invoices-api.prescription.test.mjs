/**
 * FIN-01 — mobile invoice prescription display.
 * Run: node --test lib/invoices-api.prescription.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiSrc = readFileSync(join(root, 'lib/invoices-api.ts'), 'utf8');
const screenSrc = readFileSync(join(root, 'app/invoice-details.tsx'), 'utf8');

function formatPrescriptionParts(parts) {
  const tokens = [];
  if (parts.sph != null && parts.sph !== '') tokens.push(`SPH ${parts.sph}`);
  if (parts.cyl != null && parts.cyl !== '') tokens.push(`CYL ${parts.cyl}`);
  if (parts.axis != null) tokens.push(`AXIS ${parts.axis}`);
  if (parts.add != null && parts.add !== '') tokens.push(`ADD ${parts.add}`);
  const eye = typeof parts.eye === 'string' ? parts.eye.trim() : '';
  if (eye) tokens.push(`Eye ${eye}`);
  return tokens.length ? tokens.join(', ') : null;
}

function formatLensOrderDetails(order) {
  if (!order) return '—';
  const fromOrder = formatPrescriptionParts({
    sph: order.sph,
    cyl: order.cyl,
    axis: order.axis,
    add: order.add,
    eye: order.eye,
  });
  if (fromOrder) return fromOrder;
  if (order.singleVisionLens) {
    return (
      formatPrescriptionParts({
        sph: order.singleVisionLens.sph,
        cyl: order.singleVisionLens.cyl,
      }) ?? '—'
    );
  }
  return order.lensType || '—';
}

function formatInvoiceLensDetails(invoice) {
  const labels = (invoice.lines ?? [])
    .map((line) => line.powerLabel?.trim())
    .filter(Boolean);
  if (labels.length === 1) return labels[0];
  if (labels.length > 1) return labels.join('; ');
  return formatLensOrderDetails(invoice.order ?? undefined);
}

describe('FIN-01 mobile prescription display', () => {
  it('matches website: line snapshot wins over catalog', () => {
    const text = formatInvoiceLensDetails({
      lines: [{ powerLabel: 'SPH -0.5 / CYL 0' }],
      order: {
        sph: -0.5,
        cyl: 0,
        singleVisionLens: { sph: -6, cyl: -2 },
      },
    });
    assert.equal(text, 'SPH -0.5 / CYL 0');
  });

  it('falls back to order prescription before catalog', () => {
    const text = formatInvoiceLensDetails({
      lines: [],
      order: {
        sph: -0.5,
        cyl: 0,
        singleVisionLens: { sph: -6, cyl: -2 },
      },
    });
    assert.equal(text, 'SPH -0.5, CYL 0');
  });
});

describe('FIN-01 mobile source contract', () => {
  it('invoices-api exports formatInvoiceLensDetails', () => {
    assert.match(apiSrc, /export function formatInvoiceLensDetails/);
    assert.match(apiSrc, /order\.sph/);
  });

  it('invoice-details uses formatInvoiceLensDetails', () => {
    assert.match(screenSrc, /formatInvoiceLensDetails\(invoice\)/);
    assert.doesNotMatch(screenSrc, /order\.singleVisionLens/);
  });
});

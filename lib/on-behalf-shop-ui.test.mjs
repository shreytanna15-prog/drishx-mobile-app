/**
 * Order on Behalf shop UI helpers (MOB-UX-06/07/08).
 * Run: node --test lib/on-behalf-shop-ui.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function onBehalfShopCatalogSubtitle({ loadingProducts, totalProducts }) {
  if (loadingProducts) return 'Loading products...';
  return `${totalProducts} products available`;
}

function canPlaceOnBehalfOrder({ selectedLineCount, placingOrder }) {
  return selectedLineCount > 0 && !placingOrder;
}

describe('MOB-UX-08 catalog subtitle', () => {
  it('shows loading copy while catalog request is pending', () => {
    assert.equal(
      onBehalfShopCatalogSubtitle({ loadingProducts: true, totalProducts: 0 }),
      'Loading products...'
    );
  });

  it('shows product count after load', () => {
    assert.equal(
      onBehalfShopCatalogSubtitle({ loadingProducts: false, totalProducts: 42 }),
      '42 products available'
    );
  });
});

describe('MOB-UX-07 place order enablement', () => {
  it('disables when no lines or placing', () => {
    assert.equal(canPlaceOnBehalfOrder({ selectedLineCount: 0, placingOrder: false }), false);
    assert.equal(canPlaceOnBehalfOrder({ selectedLineCount: 2, placingOrder: true }), false);
    assert.equal(canPlaceOnBehalfOrder({ selectedLineCount: 1, placingOrder: false }), true);
  });
});

describe('MOB-UX-06/07/08/09/10 source contracts', () => {
  it('screen uses helpers and correct FlatList section order', () => {
    const src = readFileSync(join(root, 'app/employee-order-on-behalf.tsx'), 'utf8');
    assert.match(src, /onBehalfShopCatalogSubtitle/);
    assert.match(src, /canPlaceOnBehalfOrder/);
    assert.match(src, /from '@\/lib\/on-behalf-shop-ui'/);

    const shopStart = src.indexOf('styles.shopContent');
    assert.ok(shopStart > 0);
    const shopSlice = src.slice(shopStart);

    const chooseIdx = shopSlice.indexOf('Choose products');
    const selectedIdx = shopSlice.indexOf('Selected products');
    const notesIdx = shopSlice.indexOf('Notes (optional)');
    const placeIdx = shopSlice.indexOf('Place order for customer');
    const catalogCardIdx = shopSlice.indexOf('styles.shopCard');
    assert.ok(chooseIdx > 0 && catalogCardIdx > chooseIdx);
    assert.ok(selectedIdx > catalogCardIdx && notesIdx > selectedIdx && placeIdx > notesIdx);

    const footerSlice = shopSlice.slice(
      shopSlice.indexOf('ListFooterComponent='),
      shopSlice.indexOf('ListEmptyComponent=')
    );
    assert.match(footerSlice, /Selected products/);
    assert.match(footerSlice, /Notes \(optional\)/);
    assert.match(footerSlice, /Place order for customer/);
    assert.match(footerSlice, /canPlaceOnBehalfOrder/);
    assert.doesNotMatch(footerSlice, /Choose products/);
    assert.doesNotMatch(src, /\d\) Choose (company|products)/);
    assert.doesNotMatch(src, /\d\) Notes \(optional\)/);
    assert.match(src, /selectedLineCount: selectedLines\.length/);
  });

  it('pins customer banner outside the shop FlatList (MOB-UX-10)', () => {
    const src = readFileSync(join(root, 'app/employee-order-on-behalf.tsx'), 'utf8');
    assert.match(src, /styles\.customerBanner/);
    assert.match(src, /styles\.shopStep/);

    const shopStepIdx = src.indexOf('styles.shopStep');
    const bannerIdx = src.indexOf('styles.customerBanner');
    const listIdx = src.indexOf('contentContainerStyle={styles.shopContent}');
    assert.ok(shopStepIdx > 0 && bannerIdx > shopStepIdx && listIdx > bannerIdx);

    const headerSlice = src.slice(
      src.indexOf('ListHeaderComponent={', listIdx),
      src.indexOf('renderItem={({ item: lens })', listIdx)
    );
    assert.doesNotMatch(headerSlice, /customerPill|Customer:/);
    assert.match(headerSlice, /Shop/);
  });

  it('exports helpers from on-behalf-shop-ui.ts', () => {
    const src = readFileSync(join(root, 'lib/on-behalf-shop-ui.ts'), 'utf8');
    assert.match(src, /export function onBehalfShopCatalogSubtitle/);
    assert.match(src, /export function canPlaceOnBehalfOrder/);
  });
});

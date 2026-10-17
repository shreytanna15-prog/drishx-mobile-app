/** Pure helpers for Order on Behalf → Shop (MOB-UX-06/07/08). */

export function onBehalfShopCatalogSubtitle(options: {
  loadingProducts: boolean;
  totalProducts: number;
}): string {
  if (options.loadingProducts) {
    return 'Loading products...';
  }
  return `${options.totalProducts} products available`;
}

/** Place-order CTA enabled only when lines exist and a submit is not in flight. */
export function canPlaceOnBehalfOrder(options: {
  selectedLineCount: number;
  placingOrder: boolean;
}): boolean {
  return options.selectedLineCount > 0 && !options.placingOrder;
}

import { PIECES_PER_PAIR } from '@/lib/order-quantity';

/** Catalog / DB lens price is per pair (2 pieces). */
export const LENS_PRICE_PER_PAIR_LABEL = '/ pr';

export function lineTotalForPieceQuantity(pairPrice: number, pieces: number): number {
  if (!Number.isFinite(pairPrice) || !Number.isFinite(pieces) || pieces < 1) {
    return 0;
  }
  return pairPrice * (pieces / PIECES_PER_PAIR);
}

export function pieceUnitPrice(pairPrice: number): number {
  if (!Number.isFinite(pairPrice)) {
    return 0;
  }
  return pairPrice / PIECES_PER_PAIR;
}

export function formatLensPairPrice(pairPrice: number): string {
  return `₹${pairPrice}${LENS_PRICE_PER_PAIR_LABEL}`;
}

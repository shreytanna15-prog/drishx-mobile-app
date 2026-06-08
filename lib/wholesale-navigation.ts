import type { FilterOption } from '@/lib/types/lens';

export type WholesaleCategoryId = 'sv' | 'kt' | 'v2';

export function wholesaleCategoryToFilter(category: WholesaleCategoryId): FilterOption {
  switch (category) {
    case 'sv':
      return 'Single Vision';
    case 'kt':
      return 'Kryptok';
    case 'v2':
      return 'Progressive';
  }
}

export function wholesaleCategoryTitle(category: WholesaleCategoryId): string {
  switch (category) {
    case 'sv':
      return 'Single Vision';
    case 'kt':
      return 'Kryptok';
    case 'v2':
      return 'Progressive';
  }
}

export function wholesaleCategoryToApiType(category: WholesaleCategoryId): string {
  switch (category) {
    case 'sv':
      return 'single-vision';
    case 'kt':
      return 'kryptok';
    case 'v2':
      return 'progressive';
  }
}

export function parseWholesaleCategory(raw: string | string[] | undefined): WholesaleCategoryId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'sv' || value === 'kt' || value === 'v2') {
    return value;
  }
  return 'sv';
}

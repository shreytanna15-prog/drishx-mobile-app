import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import type { FilterOption } from '@/lib/types/lens';

export type WholesaleCategoryId = 'sv' | 'kt' | 'v2';

export type LensCatalogCategory = {
  id: WholesaleCategoryId;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

export const LENS_CATALOG_CATEGORIES: LensCatalogCategory[] = [
  { id: 'sv', title: 'Single Vision', subtitle: 'SV products', icon: 'remove-red-eye' },
  { id: 'kt', title: 'Kryptok', subtitle: 'KT products', icon: 'visibility' },
  { id: 'v2', title: 'Progressive', subtitle: 'V2 products', icon: 'center-focus-strong' },
];

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

export function filterToCatalogCategory(filter: FilterOption): WholesaleCategoryId | null {
  switch (filter) {
    case 'Single Vision':
      return 'sv';
    case 'Kryptok':
      return 'kt';
    case 'Progressive':
      return 'v2';
    default:
      return null;
  }
}

export function catalogCategoryDisplayTitle(category: WholesaleCategoryId): string {
  switch (category) {
    case 'sv':
      return 'SINGLE VISION';
    case 'kt':
      return 'KRYPTOK';
    case 'v2':
      return 'PROGRESSIVE';
  }
}

export function parseWholesaleCategory(raw: string | string[] | undefined): WholesaleCategoryId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'sv' || value === 'kt' || value === 'v2') {
    return value;
  }
  return 'sv';
}

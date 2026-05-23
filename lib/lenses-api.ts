import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { FilterOption, LensItem, LensType } from '@/lib/types/lens';

export const PAGE_SIZE = 21;
export const LOAD_MORE_AT_INDEX = 14;

export type LensesPageResponse = {
  items: Array<{
    id: string;
    lensType: 'KRYPTOK' | 'PROGRESSIVE' | 'SINGLE_VISION';
    price: number;
    sph: number;
    cyl: number | null;
    axis: number | null;
    add: number | null;
    eye: string | null;
    quantity: number;
    createdAt: string;
    brand: string | null;
    item: string | null;
    coating: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

function toDisplayLensType(apiType: LensesPageResponse['items'][number]['lensType']): LensType {
  switch (apiType) {
    case 'KRYPTOK':
      return 'Kryptok';
    case 'PROGRESSIVE':
      return 'Progressive';
    case 'SINGLE_VISION':
      return 'Single Vision';
  }
}

export function filterToApiType(filter: FilterOption): string {
  switch (filter) {
    case 'All':
      return 'all';
    case 'Kryptok':
      return 'kryptok';
    case 'Progressive':
      return 'progressive';
    case 'Single Vision':
      return 'single-vision';
  }
}

export function mapApiLens(item: LensesPageResponse['items'][number]): LensItem {
  return {
    id: item.id,
    price: Number(item.price),
    sph: Number(item.sph),
    cyl: item.cyl !== null ? Number(item.cyl) : null,
    axis: item.axis,
    add: item.add !== null ? Number(item.add) : null,
    eye: item.eye ?? undefined,
    quantity: item.quantity,
    createdAt: item.createdAt,
    lensType: toDisplayLensType(item.lensType),
    brand: item.brand,
    item: item.item,
    coating: item.coating,
  };
}

export async function fetchLensesPage({
  page,
  limit = PAGE_SIZE,
  type,
  search,
}: {
  page: number;
  limit?: number;
  type: FilterOption;
  search: string;
}): Promise<LensesPageResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: filterToApiType(type),
  });

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.set('search', trimmedSearch);
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load lenses');
  }

  return response.json();
}

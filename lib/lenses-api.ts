import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { FilterOption, LensItem, LensType, SelectableRange } from '@/lib/types/lens';

export const PAGE_SIZE = 21;
export const LOAD_MORE_AT_INDEX = 14;

export type LensesPageResponse = {
  items: Array<{
    id: string;
    lensType: 'KRYPTOK' | 'PROGRESSIVE' | 'SINGLE_VISION';
    costPrice: number | null;
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
    index?: number | null;
    selectableRange?: SelectableRange | null;
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
    costPrice: item.costPrice !== null ? Number(item.costPrice) : null,
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
    index: item.index ?? null,
    selectableRange: item.selectableRange ?? null,
  };
}

export type LensCatalogItem = {
  name: string;
  productCount: number;
};

export async function fetchLensCatalogItems(type: string): Promise<LensCatalogItem[]> {
  const params = new URLSearchParams({ type });
  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses/items?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load lens items');
  }
  const data = (await response.json()) as { items?: LensCatalogItem[] };
  return data.items ?? [];
}

export async function fetchLensesPage({
  page,
  limit = PAGE_SIZE,
  type,
  search,
  item,
}: {
  page: number;
  limit?: number;
  type: FilterOption;
  search: string;
  item?: string;
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

  const trimmedItem = item?.trim();
  if (trimmedItem) {
    params.set('item', trimmedItem);
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load lenses');
  }

  return response.json();
}

export async function fetchRelatedLenses(
  lensId: string,
  lensType: LensType
): Promise<LensItem[]> {
  const params = new URLSearchParams({
    id: lensId,
    lensType: filterToApiType(lensType),
  });

  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses/related?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load related lenses');
  }

  const data = (await response.json()) as { items: LensesPageResponse['items'] };
  return (data.items ?? []).map(mapApiLens);
}

export async function fetchProductSiblings(
  lensId: string,
  lensType: LensType
): Promise<LensItem[]> {
  const params = new URLSearchParams({
    id: lensId,
    lensType: filterToApiType(lensType),
  });

  const response = await fetch(`${BACKEND_BASE_URL}/api/lenses/siblings?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load product siblings');
  }

  const data = (await response.json()) as { items: LensesPageResponse['items'] };
  return (data.items ?? []).map(mapApiLens);
}

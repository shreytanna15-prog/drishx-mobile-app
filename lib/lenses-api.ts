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
    sph: number | null;
    sphStartRange?: number | null;
    cyl: number | null;
    cylStartRange?: number | null;
    crossPower?: number | null;
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
    sph: item.sph !== null && item.sph !== undefined ? Number(item.sph) : null,
    sphStartRange:
      item.sphStartRange !== null && item.sphStartRange !== undefined
        ? Number(item.sphStartRange)
        : null,
    cyl: item.cyl !== null ? Number(item.cyl) : null,
    cylStartRange:
      item.cylStartRange !== null && item.cylStartRange !== undefined
        ? Number(item.cylStartRange)
        : null,
    crossPower: item.crossPower !== null && item.crossPower !== undefined ? Number(item.crossPower) : null,
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
  /** Present when the card was auto-created from an unmatched DB category. */
  dynamic?: boolean;
};

export async function fetchLensCatalogItems(type: string): Promise<LensCatalogItem[]> {
  const url = `${BACKEND_BASE_URL}/api/lenses/items?${new URLSearchParams({ type }).toString()}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Network request failed';
    throw new Error(`Cannot reach backend at ${BACKEND_BASE_URL} (${detail})`);
  }
  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} for lens items`);
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
  const trimmedSearch = search.trim();
  const planoSearch = isPlanoSearchQuery(trimmedSearch);

  if (planoSearch) {
    return fetchPlanoLensesPage({ page, limit, type, item });
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: filterToApiType(type),
  });

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

/** True when the user is searching for plano (no SPH/CYL) products. */
export function isPlanoSearchQuery(search: string): boolean {
  return search.trim().toLowerCase() === 'plano';
}

function hasMeaningfulPowerValue(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Math.abs(Number(value)) > 1e-9;
}

function isPlanoApiLens(item: LensesPageResponse['items'][number]): boolean {
  return (
    !hasMeaningfulPowerValue(item.sph) &&
    !hasMeaningfulPowerValue(item.cyl) &&
    !hasMeaningfulPowerValue(item.crossPower)
  );
}

async function fetchLensesPageRaw({
  page,
  limit,
  type,
  search,
  item,
}: {
  page: number;
  limit: number;
  type: FilterOption;
  search?: string;
  item?: string;
}): Promise<LensesPageResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: filterToApiType(type),
  });

  const trimmedSearch = search?.trim();
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

/** Frontend-only: load pages until enough plano products are collected. */
async function fetchPlanoLensesPage({
  page,
  limit,
  type,
  item,
}: {
  page: number;
  limit: number;
  type: FilterOption;
  item?: string;
}): Promise<LensesPageResponse> {
  const collected: LensesPageResponse['items'] = [];
  let apiPage = page;
  let hasMore = true;
  let total = 0;
  let lastLimit = limit;

  while (collected.length < limit && hasMore) {
    const data = await fetchLensesPageRaw({
      page: apiPage,
      limit,
      type,
      item,
    });
    total = data.total;
    lastLimit = data.limit;
    hasMore = data.hasMore;
    collected.push(...data.items.filter(isPlanoApiLens));
    if (!data.hasMore) {
      break;
    }
    if (collected.length < limit) {
      apiPage += 1;
    } else {
      break;
    }
  }

  return {
    items: collected.slice(0, limit),
    total,
    page: apiPage,
    limit: lastLimit,
    hasMore: hasMore || collected.length > limit,
  };
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

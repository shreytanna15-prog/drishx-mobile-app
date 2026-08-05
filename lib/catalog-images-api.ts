import type { ImageSourcePropType } from 'react-native';

import { BACKEND_BASE_URL } from '@/lib/api-config';

export type CatalogImageKey =
  | 'singlevision'
  | 'progressive'
  | 'kryptok'
  | 'rx'
  | 'color'
  | 'white';

export type CatalogImagesResponse = {
  images: Record<CatalogImageKey, string>;
  homeCategories: Record<string, CatalogImageKey>;
  shopCategories: Record<string, CatalogImageKey>;
};

const LOCAL_CATALOG_IMAGES: Record<CatalogImageKey, ImageSourcePropType> = {
  singlevision: require('@/assets/images/catalog/singlevision.jpeg'),
  progressive: require('@/assets/images/catalog/progressive.jpeg'),
  kryptok: require('@/assets/images/catalog/kryptok.jpeg'),
  rx: require('@/assets/images/catalog/rxorders.jpeg'),
  color: require('@/assets/images/catalog/colors.jpeg'),
  white: require('@/assets/images/catalog/glass.jpeg'),
};

const HOME_CATEGORY_KEYS: Record<string, CatalogImageKey> = {
  singlevision: 'singlevision',
  progressive: 'progressive',
  kryptok: 'kryptok',
  rx: 'rx',
  color: 'color',
  white: 'white',
};

const SHOP_CATEGORY_KEYS: Record<string, CatalogImageKey> = {
  sv: 'singlevision',
  kt: 'kryptok',
  v2: 'progressive',
};

let cached: CatalogImagesResponse | null = null;
let inflight: Promise<CatalogImagesResponse> | null = null;

export async function fetchCatalogImages(): Promise<CatalogImagesResponse> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/catalog-images`);
    if (!response.ok) {
      throw new Error('Failed to load catalog images');
    }
    const data = (await response.json()) as CatalogImagesResponse;
    cached = data;
    return data;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function catalogImageForHomeCategory(
  data: CatalogImagesResponse | null,
  categoryId: string
): string | null {
  if (!data) return null;
  const key = data.homeCategories[categoryId];
  return key ? data.images[key] ?? null : null;
}

export function catalogImageForShopCategory(
  data: CatalogImagesResponse | null,
  categoryId: string
): string | null {
  if (!data) return null;
  const key = data.shopCategories[categoryId];
  return key ? data.images[key] ?? null : null;
}

/** Prefer remote signed URL when available; otherwise use bundled local assets. */
export function catalogImageSourceForHomeCategory(
  data: CatalogImagesResponse | null,
  categoryId: string
): ImageSourcePropType | null {
  const remote = catalogImageForHomeCategory(data, categoryId);
  if (remote) return { uri: remote };
  const key = data?.homeCategories[categoryId] ?? HOME_CATEGORY_KEYS[categoryId];
  return key ? LOCAL_CATALOG_IMAGES[key] : null;
}

export function catalogImageSourceForShopCategory(
  data: CatalogImagesResponse | null,
  categoryId: string
): ImageSourcePropType | null {
  const remote = catalogImageForShopCategory(data, categoryId);
  if (remote) return { uri: remote };
  const key = data?.shopCategories[categoryId] ?? SHOP_CATEGORY_KEYS[categoryId];
  return key ? LOCAL_CATALOG_IMAGES[key] : null;
}

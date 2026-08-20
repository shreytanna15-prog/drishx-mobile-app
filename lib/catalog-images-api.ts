import type { ImageSourcePropType } from 'react-native';

import { BACKEND_BASE_URL } from '@/lib/api-config';

export type CatalogImageKey =
  | 'singlevision'
  | 'progressive'
  | 'kryptok'
  | 'rx'
  | 'color'
  | 'white';

export type ShopLensImageKey = 'singlevision' | 'progressive' | 'kryptok';

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

/** Dark-theme glass cutout (studio fill punched to alpha). */
const LOCAL_SHOP_LENS_IMAGES: Record<ShopLensImageKey, ImageSourcePropType> = {
  singlevision: require('@/assets/images/catalog/singlevision-lens.png'),
  progressive: require('@/assets/images/catalog/progressive-lens.png'),
  kryptok: require('@/assets/images/catalog/kryptok-lens.png'),
};

/** Light-theme glass cutout (studio fill punched to alpha, rim darkened for white cards). */
const LOCAL_SHOP_LENS_IMAGES_LIGHT: Record<ShopLensImageKey, ImageSourcePropType> = {
  singlevision: require('@/assets/images/catalog/singlevision-light.png'),
  progressive: require('@/assets/images/catalog/progressive-light.png'),
  kryptok: require('@/assets/images/catalog/kryptok-light.png'),
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

function isShopLensImageKey(key: CatalogImageKey): key is ShopLensImageKey {
  return key === 'singlevision' || key === 'progressive' || key === 'kryptok';
}

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

/**
 * Shop category cards use processed PNGs (from lens-imgs/*.jpeg via
 * scripts/process-lens-assets.js). Studio backdrop is punched to alpha.
 */
export function catalogImageSourceForShopCategory(
  data: CatalogImagesResponse | null,
  categoryId: string,
  scheme: 'light' | 'dark' = 'dark'
): ImageSourcePropType | null {
  const key = data?.shopCategories[categoryId] ?? SHOP_CATEGORY_KEYS[categoryId];
  if (!key) return null;
  if (isShopLensImageKey(key)) {
    return scheme === 'light'
      ? LOCAL_SHOP_LENS_IMAGES_LIGHT[key]
      : LOCAL_SHOP_LENS_IMAGES[key];
  }
  const remote = catalogImageForShopCategory(data, categoryId);
  if (remote) return { uri: remote };
  return LOCAL_CATALOG_IMAGES[key] ?? null;
}

const LENS_TYPE_TO_SHOP_CATEGORY: Record<string, string> = {
  'Single Vision': 'sv',
  Kryptok: 'kt',
  Progressive: 'v2',
};

/** Blended local lens art for product list / detail cards. */
export function catalogImageSourceForLensType(
  lensType: string | undefined,
  scheme: 'light' | 'dark' = 'dark'
): ImageSourcePropType | null {
  const categoryId = LENS_TYPE_TO_SHOP_CATEGORY[lensType ?? ''] ?? 'sv';
  return catalogImageSourceForShopCategory(null, categoryId, scheme);
}

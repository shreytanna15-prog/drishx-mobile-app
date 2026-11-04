import { BACKEND_BASE_URL } from '@/lib/api-config';

/** Resolve storage path or absolute URL for a legacy order image attachment. */
export function resolvePhotoOrderImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${BACKEND_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

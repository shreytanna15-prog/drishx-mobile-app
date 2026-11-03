import { BACKEND_BASE_URL } from '@/lib/api-config';
export type PhotoOrderUploadResult = {
  order: {
    id: string;
    orderNumber: number | null;
    orderImageUrl: string;
    status: string;
    createdAt: string;
  };
  message: string;
};

export function resolvePhotoOrderImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${BACKEND_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

/**
 * RC-02: photo prescription orders are retired (POST /api/orders/photo → 410).
 * Kept only so stale callers fail loudly instead of hitting the network.
 * Legacy photo rows still display via `resolvePhotoOrderImageUrl`.
 */
export async function uploadPhotoOrder(
  _imageUri: string,
  _mimeType: string,
  _fileName: string,
  _headers: Record<string, string>
): Promise<PhotoOrderUploadResult> {
  throw new Error(
    'Photo prescription orders have been retired. Please place a prescription order using the RX form.'
  );
}

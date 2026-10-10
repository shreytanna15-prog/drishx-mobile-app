import { BACKEND_BASE_URL } from '@/lib/api-config';
import { authFetch } from '@/lib/auth-fetch';

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

export async function uploadPhotoOrder(
  imageUri: string,
  mimeType: string,
  fileName: string,
  _headers: Record<string, string>
): Promise<PhotoOrderUploadResult> {
  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  // authFetch attaches the live Bearer token (ignore possibly stale headers).
  const response = await authFetch(`${BACKEND_BASE_URL}/api/orders/photo`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to upload photo order.');
  }

  return result as PhotoOrderUploadResult;
}

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

export async function uploadPhotoOrder(
  imageUri: string,
  mimeType: string,
  fileName: string,
  headers: Record<string, string>
): Promise<PhotoOrderUploadResult> {
  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const authHeaders: Record<string, string> = {};
  const auth = headers.Authorization;
  if (auth) {
    authHeaders.Authorization = auth;
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/orders/photo`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to upload photo order.');
  }

  return result as PhotoOrderUploadResult;
}

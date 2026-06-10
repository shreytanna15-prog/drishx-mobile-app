import { BACKEND_BASE_URL } from '@/lib/api-config';

export type ColorReferenceUploadResult = {
  imageUrl: string;
  storedImageUrl: string;
  message: string;
};

export async function uploadColorReference(
  imageUri: string,
  mimeType: string,
  fileName: string,
  headers: Record<string, string>
): Promise<ColorReferenceUploadResult> {
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

  const response = await fetch(`${BACKEND_BASE_URL}/api/color-references`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to upload color reference.');
  }

  return result as ColorReferenceUploadResult;
}

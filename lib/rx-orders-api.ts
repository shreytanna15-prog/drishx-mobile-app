import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch, isOfflineQueuedError } from '@/lib/api-request';
import { uploadColorReference } from '@/lib/color-reference-api';
import type { RxLensTypeId, RxOrderFor, RxPrescription } from '@/lib/rx-order';

export type PlaceRxOrderInput = {
  lensType: RxLensTypeId;
  orderFor: RxOrderFor;
  quantity: number;
  samePowerForBothEyes: boolean;
  prescription: RxPrescription;
  feature: string;
  lensIndex: string;
  coating: string;
  productName?: string | null;
  remarks?: string | null;
  remarkTags?: string[];
  prescriptionImageUrl?: string | null;
  /** When staff places for a customer (order on behalf). */
  userId?: string;
};

export type UploadRxPrescriptionResult = {
  storedImageUrl: string;
  imageUrl: string;
  message: string;
};

/** Uploads RX prescription images to the same Supabase bucket used for color orders. */
export async function uploadRxPrescription(
  imageUri: string,
  mimeType: string,
  fileName: string,
  headers: Record<string, string>
): Promise<UploadRxPrescriptionResult> {
  const result = await uploadColorReference(imageUri, mimeType, fileName, headers);
  return {
    storedImageUrl: result.storedImageUrl,
    imageUrl: result.imageUrl,
    message: result.message,
  };
}

export async function placeRxOrder(
  input: PlaceRxOrderInput,
  headers: Record<string, string>
): Promise<
  { success: true; orderId: string; message: string } | { success: false; error: string }
> {
  try {
    const { userId, ...orderBody } = input;
    const response = await apiFetch(`${BACKEND_BASE_URL}/api/orders/rx`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...orderBody,
        ...(userId?.trim() ? { userId: userId.trim() } : {}),
      }),
      queueWhenOffline: true,
      queueLabel: 'Place RX order',
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: result?.error || 'Failed to place RX order.' };
    }

    return {
      success: true,
      orderId: result?.order?.id ?? '',
      message:
        result?.message ||
        'Your prescription order has been placed. Our team will confirm pricing and delivery.',
    };
  } catch (error) {
    if (isOfflineQueuedError(error)) {
      return {
        success: true,
        orderId: error.queueId,
        message: error.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place RX order.',
    };
  }
}

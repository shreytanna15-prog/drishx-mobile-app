import { BACKEND_BASE_URL } from '@/lib/api-config';
import {
  COLOR_LENS_DEFAULT_COATING,
  COLOR_LENS_DEFAULT_TINT_STRENGTH,
  type ColorLensOrderParams,
} from '@/lib/color-lens-order';
import type { ColorLensTypeId } from '@/lib/color-lens';
import {
  formatLensIndex,
  getLensIndexForMaterial,
  type ColorLensMaterialId,
} from '@/lib/color-lens-specifications';
import type { ColorLensPrescription } from '@/lib/color-lens-prescription';

export type PlaceColorLensOrderInput = ColorLensOrderParams & {
  colorName: string;
  prescription: ColorLensPrescription;
  materialId: ColorLensMaterialId;
};

export type PlaceColorLensOrderResult = {
  order: {
    id: string;
    orderNumber: number | null;
    status: string;
    createdAt: string;
  };
  message: string;
};

export async function placeColorLensOrder(
  input: PlaceColorLensOrderInput,
  headers: Record<string, string>
): Promise<
  { success: true; orderId: string; message: string } | { success: false; error: string }
> {
  const lensType = (input.lensType as ColorLensTypeId | undefined) ?? 'single-vision';
  const lensIndex = formatLensIndex(getLensIndexForMaterial(input.materialId));

  const payload = {
    colorId: input.colorId ?? null,
    colorName: input.colorName,
    colorHex: input.colorHex ?? null,
    lensType,
    materialId: input.materialId,
    coating: COLOR_LENS_DEFAULT_COATING,
    tintStrength: input.tintStrength ?? COLOR_LENS_DEFAULT_TINT_STRENGTH,
    lensIndex,
    referenceImageUrl: input.referenceImageUrl ?? null,
    prescription: {
      right: input.prescription.right,
      left: input.prescription.left,
    },
  };

  const response = await fetch(`${BACKEND_BASE_URL}/api/orders/color-lens`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: result?.error || 'Failed to place color lens order.' };
  }

  const typed = result as PlaceColorLensOrderResult;
  return {
    success: true,
    orderId: typed.order?.id ?? '',
    message:
      typed.message ||
      'Your color lens order has been placed. Our team will confirm pricing and delivery.',
  };
}

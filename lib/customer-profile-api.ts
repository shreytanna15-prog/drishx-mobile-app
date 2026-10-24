import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import type { AuthUser } from '@/lib/auth';
import { mapApiUser } from '@/lib/auth-api';

export type CustomerProfilePatchPayload = {
  name?: string | null;
  alternateMobileNumber?: string | null;
  whatsappNumber?: string | null;
  shopName?: string | null;
  businessType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  businessEmail?: string | null;
  shopPhoneNumber?: string | null;
  gstNumber?: string | null;
  legalBusinessName?: string | null;
  tradeName?: string | null;
  gstRegistrationState?: string | null;
  panNumber?: string | null;
  billingLegalName?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  billingGstState?: string | null;
  shippingLegalName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPincode?: string | null;
};

export type CustomerProfilePatchResponse = {
  user: AuthUser;
  message: string;
};

/** PATCH /api/users/me/profile — self-update → PENDING_REVIEW. */
export async function updateCustomerProfile(
  payload: CustomerProfilePatchPayload
): Promise<CustomerProfilePatchResponse> {
  const response = await apiFetch(`${BACKEND_BASE_URL}/api/users/me/profile`, {
    method: 'PATCH',
    authenticated: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: string;
    user?: Record<string, unknown>;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(
      typeof json.error === 'string' ? json.error : 'Failed to update profile.'
    );
  }
  if (!json.user) {
    throw new Error('Invalid profile response.');
  }
  return {
    user: mapApiUser(json.user),
    message: json.message ?? 'Profile updated.',
  };
}

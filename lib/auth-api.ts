import { BACKEND_BASE_URL } from '@/lib/api-config';
import { authFetch, MOBILE_CLIENT_HEADERS } from '@/lib/auth-fetch';
import type { AuthUser } from '@/lib/auth';

export type ApiUser = AuthUser;

/** RW-07: all fields except userId are optional on sparse registration submit. */
export type CustomerRegistrationPayload = {
  userId: string;
  shopName?: string;
  businessType?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  businessEmail?: string;
  shopPhoneNumber?: string;
  gstNumber?: string;
  legalBusinessName?: string;
  tradeName?: string;
  gstRegistrationState?: string;
  panNumber?: string;
  billingLegalName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  billingGstState?: string;
  shippingLegalName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
};

export async function submitGstDetails(payload: CustomerRegistrationPayload) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/gst`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...MOBILE_CLIENT_HEADERS,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to submit registration details.');
  }
  return result as {
    user: ApiUser;
    message: string;
    token: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

export async function fetchCurrentUser(token: string) {
  const response = await authFetch(`${BACKEND_BASE_URL}/api/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to fetch account status.');
  }
  return result as { user: ApiUser };
}

function optionalString(value: unknown): string | null {
  return value ? String(value) : null;
}

export function mapApiUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: String(raw.id),
    email: String(raw.email),
    name: raw.name ? String(raw.name) : null,
    role: String(raw.role),
    isActive: Boolean(raw.isActive),
    isApproved: Boolean(raw.isApproved),
    approvalStatus: String(raw.approvalStatus ?? 'PENDING_REVIEW') as AuthUser['approvalStatus'],
    gstNumber: optionalString(raw.gstNumber),
    businessName: optionalString(raw.businessName),
    businessAddress: optionalString(raw.businessAddress),
    state: optionalString(raw.state),
    pincode: optionalString(raw.pincode),
    mobileNumber: optionalString(raw.mobileNumber),
    alternateMobileNumber: optionalString(raw.alternateMobileNumber),
    whatsappNumber: optionalString(raw.whatsappNumber),
    shopName: optionalString(raw.shopName),
    businessType: optionalString(raw.businessType),
    addressLine1: optionalString(raw.addressLine1),
    addressLine2: optionalString(raw.addressLine2),
    city: optionalString(raw.city),
    businessEmail: optionalString(raw.businessEmail),
    shopPhoneNumber: optionalString(raw.shopPhoneNumber),
    legalBusinessName: optionalString(raw.legalBusinessName),
    tradeName: optionalString(raw.tradeName),
    gstRegistrationState: optionalString(raw.gstRegistrationState),
    panNumber: optionalString(raw.panNumber),
    billingLegalName: optionalString(raw.billingLegalName),
    billingAddress: optionalString(raw.billingAddress),
    billingCity: optionalString(raw.billingCity),
    billingState: optionalString(raw.billingState),
    billingPincode: optionalString(raw.billingPincode),
    billingGstState: optionalString(raw.billingGstState),
    shippingLegalName: optionalString(raw.shippingLegalName),
    shippingAddress: optionalString(raw.shippingAddress),
    shippingCity: optionalString(raw.shippingCity),
    shippingState: optionalString(raw.shippingState),
    shippingPincode: optionalString(raw.shippingPincode),
    rejectionReason: optionalString(raw.rejectionReason),
  };
}

export function getCustomerNextRoute(
  user: AuthUser
): '/business-info' | '/pending-approval' | '/(tabs)' {
  if (user.role !== 'CUSTOMER') {
    return '/(tabs)';
  }
  if (user.approvalStatus === 'REJECTED') {
    return '/pending-approval';
  }
  // RW-07: incomplete profiles wait for admin; optional steps are not forced.
  if (!user.gstNumber) {
    return '/pending-approval';
  }
  // RW-04: suspended customers keep APPROVED with isActive=false.
  if (!user.isApproved || user.approvalStatus !== 'APPROVED' || !user.isActive) {
    return '/pending-approval';
  }
  return '/(tabs)';
}

import { BACKEND_BASE_URL } from '@/lib/api-config';
import { MOBILE_CLIENT_HEADERS } from '@/lib/auth-fetch';
import type { AuthUser } from '@/lib/auth';

export type ApiUser = AuthUser;

export async function submitGstDetails(payload: {
  userId: string;
  gstNumber: string;
  businessName: string;
  businessAddress: string;
  state?: string;
  pincode?: string;
}) {
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
    throw new Error(result?.error || 'Failed to submit GST details.');
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
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
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

export function mapApiUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: String(raw.id),
    email: String(raw.email),
    name: raw.name ? String(raw.name) : null,
    role: String(raw.role),
    isActive: Boolean(raw.isActive),
    isApproved: Boolean(raw.isApproved),
    approvalStatus: String(raw.approvalStatus ?? 'PENDING_REVIEW') as AuthUser['approvalStatus'],
    gstNumber: raw.gstNumber ? String(raw.gstNumber) : null,
    businessName: raw.businessName ? String(raw.businessName) : null,
    businessAddress: raw.businessAddress ? String(raw.businessAddress) : null,
    state: raw.state ? String(raw.state) : null,
    pincode: raw.pincode ? String(raw.pincode) : null,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : null,
  };
}

export function getCustomerNextRoute(user: AuthUser): '/gst-details' | '/pending-approval' | '/(tabs)' {
  if (user.role !== 'CUSTOMER') {
    return '/(tabs)';
  }
  if (user.approvalStatus === 'REJECTED') {
    return '/pending-approval';
  }
  if (!user.gstNumber) {
    return '/gst-details';
  }
  if (!user.isApproved || user.approvalStatus !== 'APPROVED') {
    return '/pending-approval';
  }
  return '/(tabs)';
}

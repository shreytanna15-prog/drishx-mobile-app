import { BACKEND_BASE_URL } from '@/lib/api-config';
import { authFetch } from '@/lib/auth-fetch';
import type { CustomerCompany } from '@/lib/customers-api';

export type WalkInOtpSendResult = {
  challengeId: string;
  providerSessionId: string | null;
  mobileNumber: string;
};

export type WalkInOtpVerifyResult = {
  ok: boolean;
  challengeId: string;
  mobileNumber: string;
  user: CustomerCompany | null;
};

export type CreateWalkInPayload = {
  mobileNumber: string;
  challengeId: string;
  name?: string;
  shopName?: string;
  businessName?: string;
  email?: string;
};

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; details?: string };
    if (data.error && data.details) return `${data.error} (${data.details})`;
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function sendWalkInMobileOtp(
  mobileNumber: string
): Promise<WalkInOtpSendResult> {
  const res = await authFetch(`${BACKEND_BASE_URL}/api/auth/otp/mobile/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, purpose: 'WALK_IN' }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to send OTP.'));
  return res.json() as Promise<WalkInOtpSendResult>;
}

export async function verifyWalkInMobileOtp(input: {
  mobileNumber: string;
  code: string;
  providerSessionId?: string | null;
}): Promise<WalkInOtpVerifyResult> {
  const res = await authFetch(`${BACKEND_BASE_URL}/api/auth/otp/mobile/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mobileNumber: input.mobileNumber,
      code: input.code,
      purpose: 'WALK_IN',
      providerSessionId: input.providerSessionId ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to verify OTP.'));
  return res.json() as Promise<WalkInOtpVerifyResult>;
}

export async function createWalkInCustomer(
  payload: CreateWalkInPayload
): Promise<CustomerCompany> {
  const res = await authFetch(`${BACKEND_BASE_URL}/api/users/customers/walk-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to create walk-in customer.'));
  }
  const data = (await res.json()) as { customer: CustomerCompany };
  return data.customer;
}

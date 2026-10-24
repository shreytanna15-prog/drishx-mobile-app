import { BACKEND_BASE_URL } from '@/lib/api-config';
import { MOBILE_CLIENT_HEADERS } from '@/lib/auth-fetch';
import type { AuthUser } from '@/lib/auth';
import { mapApiUser } from '@/lib/auth-api';

export type OtpPurpose =
  | 'SIGNUP'
  | 'LOGIN'
  | 'VERIFY_EMAIL'
  | 'WALK_IN'
  | 'ADMIN_INVITE';

export type MobileOtpSendResponse = {
  ok: true;
  challengeId: string;
  providerSessionId: string | null;
  expiresAt: string;
  purpose: OtpPurpose;
  mobileNumber: string;
};

export type MobileOtpVerifyResponse = {
  user?: AuthUser;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  ok?: boolean;
  purpose?: OtpPurpose;
  mobileNumber?: string;
  mobileVerified?: boolean;
  challengeId?: string;
  error?: string;
  code?: string;
};

export type EmailOtpSendResponse = {
  ok: true;
  challengeId: string;
  providerSessionId: string | null;
  expiresAt: string;
  purpose: OtpPurpose;
  email: string;
};

export type EmailOtpVerifyResponse = {
  ok: true;
  purpose: OtpPurpose;
  email: string;
  emailVerified: boolean;
  challengeId: string;
  user: AuthUser | null;
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

export async function sendMobileOtp(input: {
  mobileNumber: string;
  purpose: OtpPurpose;
}): Promise<MobileOtpSendResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/auth/otp/mobile/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...MOBILE_CLIENT_HEADERS,
    },
    body: JSON.stringify({
      mobileNumber: input.mobileNumber.trim(),
      purpose: input.purpose,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to send OTP.'));
  }
  return res.json() as Promise<MobileOtpSendResponse>;
}

export async function verifyMobileOtp(input: {
  mobileNumber: string;
  purpose: OtpPurpose;
  code: string;
  providerSessionId?: string | null;
  name?: string;
  businessName?: string;
  alternateMobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
}): Promise<MobileOtpVerifyResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/auth/otp/mobile/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...MOBILE_CLIENT_HEADERS,
    },
    body: JSON.stringify({
      mobileNumber: input.mobileNumber.trim(),
      purpose: input.purpose,
      code: input.code.trim(),
      providerSessionId: input.providerSessionId ?? undefined,
      name: input.name?.trim() || undefined,
      businessName: input.businessName?.trim() || undefined,
      alternateMobileNumber: input.alternateMobileNumber?.trim() || undefined,
      whatsappNumber: input.whatsappNumber?.trim() || undefined,
      email: input.email?.trim().toLowerCase() || undefined,
    }),
  });

  const data = (await res.json()) as MobileOtpVerifyResponse & {
    user?: Record<string, unknown>;
  };
  if (!res.ok) {
    throw new Error(data.error ?? (await parseError(res, 'OTP verification failed.')));
  }

  return {
    ...data,
    user: data.user ? mapApiUser(data.user as Record<string, unknown>) : undefined,
  };
}

export async function sendEmailOtp(input: {
  email: string;
  purpose: OtpPurpose;
  accessToken?: string | null;
}): Promise<EmailOtpSendResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...MOBILE_CLIENT_HEADERS,
  };
  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }
  const res = await fetch(`${BACKEND_BASE_URL}/api/auth/otp/email/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      purpose: input.purpose,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to send email OTP.'));
  }
  return res.json() as Promise<EmailOtpSendResponse>;
}

export async function verifyEmailOtp(input: {
  email: string;
  purpose: OtpPurpose;
  code: string;
  providerSessionId?: string | null;
  accessToken?: string | null;
}): Promise<EmailOtpVerifyResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...MOBILE_CLIENT_HEADERS,
  };
  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }
  const res = await fetch(`${BACKEND_BASE_URL}/api/auth/otp/email/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      purpose: input.purpose,
      code: input.code.trim(),
      providerSessionId: input.providerSessionId ?? undefined,
    }),
  });
  const data = (await res.json()) as EmailOtpVerifyResponse & {
    user?: Record<string, unknown> | null;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? (await parseError(res, 'Email OTP failed.')));
  }
  return {
    ...data,
    user: data.user ? mapApiUser(data.user as Record<string, unknown>) : null,
  };
}

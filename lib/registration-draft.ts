import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegistrationBusinessInfo = {
  shopName: string;
  businessType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  businessEmail: string;
  shopPhoneNumber: string;
};

export type RegistrationGstInfo = {
  gstNumber: string;
  legalBusinessName: string;
  tradeName: string;
  gstRegistrationState: string;
  panNumber: string;
};

export const EMPTY_BUSINESS_INFO: RegistrationBusinessInfo = {
  shopName: '',
  businessType: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  businessEmail: '',
  shopPhoneNumber: '',
};

export const EMPTY_GST_INFO: RegistrationGstInfo = {
  gstNumber: '',
  legalBusinessName: '',
  tradeName: '',
  gstRegistrationState: '',
  panNumber: '',
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function validateOptionalGstinPan(input: {
  gstNumber?: string;
  panNumber?: string;
}): string | null {
  const gst = input.gstNumber?.trim().toUpperCase() ?? '';
  const pan = input.panNumber?.trim().toUpperCase() ?? '';
  if (gst && !GSTIN_REGEX.test(gst)) return 'Invalid GSTIN format.';
  if (pan && !PAN_REGEX.test(pan)) return 'Invalid PAN format.';
  return null;
}

export type RegistrationDraft = {
  userId: string;
  email: string;
  business?: RegistrationBusinessInfo;
  gst?: RegistrationGstInfo;
};

const DRAFT_KEY = '@drishx/registration-draft';

let memoryDraft: RegistrationDraft | null = null;

export async function saveRegistrationDraft(draft: RegistrationDraft) {
  memoryDraft = draft;
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadRegistrationDraft(): Promise<RegistrationDraft | null> {
  if (memoryDraft) return memoryDraft;
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    memoryDraft = JSON.parse(raw) as RegistrationDraft;
    return memoryDraft;
  } catch {
    return null;
  }
}

export async function clearRegistrationDraft() {
  memoryDraft = null;
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function getDraftForUser(
  userId: string,
  email: string
): Promise<RegistrationDraft> {
  const existing = await loadRegistrationDraft();
  if (existing?.userId === userId) {
    return { ...existing, email: email || existing.email };
  }
  return { userId, email };
}

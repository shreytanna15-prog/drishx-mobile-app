import { BACKEND_BASE_URL } from '@/lib/api-config';

export type ReturnRequestType = 'RETURN' | 'REPLACEMENT';
export type ReturnRequestStatus =
  | 'SUBMITTED'
  | 'MORE_INFO_REQUIRED'
  | 'ESCALATED_TO_ADMIN'
  | 'AWAITING_MATERIAL'
  | 'APPROVED_CREDIT'
  | 'APPROVED_REPLACEMENT'
  | 'REJECTED'
  | 'CLOSED';

export type ReturnReason =
  | 'WRONG_POWER'
  | 'MANUFACTURING_DEFECT'
  | 'COATING_ISSUE'
  | 'BROKEN_IN_TRANSPORT'
  | 'WRONG_PRODUCT'
  | 'EXCESS_STOCK_RETURN'
  | 'OTHER';

export type ReturnRequestRecord = {
  id: string;
  requestNumber: string;
  requestType: ReturnRequestType;
  status: ReturnRequestStatus;
  customerRemarks?: string | null;
  employeeRemarks?: string | null;
  adminRemarks?: string | null;
  rejectionReason?: string | null;
  approvedAmount?: number | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string | null;
    email: string;
    businessName?: string | null;
  };
  items: Array<{
    id: string;
    originalOrderId: string;
    lensLabel: string;
    quantity: number;
    eye?: string | null;
    reason: ReturnReason;
    itemRemarks?: string | null;
    originalSph?: number | null;
    originalCyl?: number | null;
    originalAxis?: number | null;
    originalAdd?: number | null;
    requestedSph?: number | null;
    requestedCyl?: number | null;
    requestedAxis?: number | null;
    requestedAdd?: number | null;
  }>;
  images: Array<{
    id: string;
    imageUrl: string;
    createdAt: string;
  }>;
  timelineEvents: Array<{
    id: string;
    eventType: string;
    message: string;
    createdAt: string;
  }>;
};

export const RETURN_REASON_OPTIONS: Array<{ value: ReturnReason; label: string }> = [
  { value: 'WRONG_POWER', label: 'Wrong power received' },
  { value: 'MANUFACTURING_DEFECT', label: 'Manufacturing defect' },
  { value: 'COATING_ISSUE', label: 'Coating issue' },
  { value: 'BROKEN_IN_TRANSPORT', label: 'Broken in transport' },
  { value: 'WRONG_PRODUCT', label: 'Wrong product supplied' },
  { value: 'EXCESS_STOCK_RETURN', label: 'Excess stock return' },
  { value: 'OTHER', label: 'Other' },
];

export function formatReturnStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatReturnPowerLine(parts: {
  sph?: number | null;
  cyl?: number | null;
  add?: number | null;
  axis?: number | null;
}): string {
  const format = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    if (rounded === 0) return '0.00';
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded.toFixed(2)}`;
  };
  const labels = [
    parts.sph != null ? `SPH ${format(parts.sph)}` : null,
    parts.cyl != null ? `CYL ${format(parts.cyl)}` : null,
    parts.add != null ? `ADD ${format(parts.add)}` : null,
    parts.axis != null ? `AXIS ${parts.axis}` : null,
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(' · ') : '—';
}

export async function fetchReturnRequests(
  headers: Record<string, string>
): Promise<ReturnRequestRecord[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/returns`, { headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load return requests.');
  }
  return Array.isArray(result) ? (result as ReturnRequestRecord[]) : [];
}

export async function fetchReturnRequest(
  id: string,
  headers: Record<string, string>
): Promise<ReturnRequestRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/returns/${id}`, { headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to load return request.');
  }
  return result as ReturnRequestRecord;
}

export async function createReturnRequest(
  input: {
    requestType: ReturnRequestType;
    customerRemarks?: string;
    items: Array<{
      orderId: string;
      quantity: number;
      eye?: string | null;
      reason: ReturnReason;
      itemRemarks?: string;
      requestedSph?: number | null;
      requestedCyl?: number | null;
      requestedAxis?: number | null;
      requestedAdd?: number | null;
    }>;
  },
  headers: Record<string, string>
): Promise<ReturnRequestRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/returns`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to submit return request.');
  }
  return result as ReturnRequestRecord;
}

export async function updateReturnRequest(
  id: string,
  action: 'more-info' | 'escalate' | 'reject',
  remarks: string | undefined,
  headers: Record<string, string>
): Promise<ReturnRequestRecord> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/returns/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ action, remarks }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to update return request.');
  }
  return result as ReturnRequestRecord;
}

export async function uploadReturnRequestPhoto(
  returnRequestId: string,
  imageUri: string,
  mimeType: string,
  fileName: string,
  headers: Record<string, string>
): Promise<{ id: string; imageUrl: string }> {
  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const authHeaders: Record<string, string> = {};
  if (headers.Authorization) {
    authHeaders.Authorization = headers.Authorization;
  }

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/returns/${returnRequestId}/images`,
    {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to upload return photo.');
  }
  return result as { id: string; imageUrl: string };
}

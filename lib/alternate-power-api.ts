import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import type {
  AlternatePowerSuggestion,
  OrderPowerVersion,
  OrderRecord,
} from '@/lib/orders-api';

export function formatAlternatePowerLabel(
  sph: number | null | undefined,
  cyl: number | null | undefined
): string {
  const s = sph === null || sph === undefined ? '—' : Number(sph).toFixed(2);
  const c = cyl === null || cyl === undefined ? '—' : Number(cyl).toFixed(2);
  return `${s} / ${c}`;
}

export async function fetchAlternateSuggestions(
  orderId: string,
  headers: Record<string, string>,
  pendingOnly = true
): Promise<AlternatePowerSuggestion[]> {
  const qs = pendingOnly ? '?pending=1' : '';
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/alternate-suggestions${qs}`,
    { headers }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to load alternate suggestions.');
  }
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

export async function fetchPowerVersions(
  orderId: string,
  headers: Record<string, string>
): Promise<OrderPowerVersion[]> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/power-versions`,
    { headers }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to load power versions.');
  }
  return Array.isArray(data.powerVersions) ? data.powerVersions : [];
}

export async function markOrderPowerNotAvailable(
  orderId: string,
  headers: Record<string, string>,
  options?: {
    notes?: string;
    supplierOptions?: Array<{ lensId: string; etaDays?: number | null }>;
  }
): Promise<{ suggestions: AlternatePowerSuggestion[] }> {
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/procurement/not-available`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(options ?? {}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to mark power not available.');
  }
  return {
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}

export async function acceptAlternateSuggestion(
  orderId: string,
  suggestionId: string,
  headers: Record<string, string>
): Promise<{ order?: Partial<OrderRecord> }> {
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/alternate-suggestions/${suggestionId}/accept`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to accept alternate power.');
  }
  return data;
}

export async function rejectAlternateSuggestion(
  orderId: string,
  suggestionId: string,
  headers: Record<string, string>
): Promise<void> {
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/alternate-suggestions/${suggestionId}/reject`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to reject suggestion.');
  }
}

export async function rejectAllAlternateSuggestions(
  orderId: string,
  headers: Record<string, string>
): Promise<void> {
  const response = await apiFetch(
    `${BACKEND_BASE_URL}/api/orders/${orderId}/alternate-suggestions/reject-all`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to reject suggestions.');
  }
}

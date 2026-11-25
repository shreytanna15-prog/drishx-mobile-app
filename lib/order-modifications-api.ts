import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';

export type OrderChange = {
  id: string; requestedQuantity: number; requestedPowerId: string | null;
  reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionReason: string | null; createdAt: string;
};

export async function fetchOrderChanges(orderId: string): Promise<{ items: OrderChange[] }> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/modification`, { authenticated: true });
  const body = await res.json().catch(() => ({})) as { items?: OrderChange[]; error?: string };
  if (!res.ok) throw new Error(body.error || 'Could not load order change requests.');
  return { items: body.items ?? [] };
}

export async function requestOrderChange(input: {
  orderId: string; quantity: number; lensProductPowerId?: string; reason: string;
}): Promise<OrderChange> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/orders/${encodeURIComponent(input.orderId)}/modification`, {
    method: 'POST', authenticated: true, body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({})) as OrderChange & { error?: string };
  if (!res.ok) throw new Error(body.error || 'Could not request a change.');
  return body;
}

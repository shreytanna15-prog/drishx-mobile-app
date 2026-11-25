import { BACKEND_BASE_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-request';
import type { Paginated } from '@/lib/types/api-client';

export type CatalogPower = {
  id: string; variantId: string; skuCode: string; name: string;
  family: string; base: string; sph: number; cyl: number;
  axis: number | null; addition: number | null; eye: string | null;
  price: number; available: number;
};

export type CatalogDeliveryService = {
  id: string; courierCompany: string; serviceName: string; isActive?: boolean;
};

export async function fetchCatalogPowers(params: { q?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/catalog/powers?${query}`);
  if (!res.ok) throw new Error('Could not load catalog stock.');
  return res.json() as Promise<Paginated<CatalogPower>>;
}

export async function fetchCatalogDeliveryServices(): Promise<CatalogDeliveryService[]> {
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/delivery-services`);
  if (!res.ok) throw new Error('Could not load delivery services.');
  return res.json() as Promise<CatalogDeliveryService[]>;
}

export type CatalogOrderInput = {
  lensProductPowerId: string; quantity: number;
  stockMode: 'LIVE' | 'NON_LIVE'; deliveryServiceId: string;
  userId?: string;
  notes?: string;
};

export async function placeCatalogOrder(input: CatalogOrderInput): Promise<{ order: { id: string }; needsProcurement: boolean }> {
  // A live stock decision cannot be queued offline: the server must recheck availability.
  const res = await apiFetch(`${BACKEND_BASE_URL}/api/orders/catalog`, {
    method: 'POST', authenticated: true, body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Could not place catalog order.');
  }
  return res.json();
}

import { BACKEND_BASE_URL } from '@/lib/api-config';
import type { OrderRecord } from '@/lib/orders-api';

export type CustomerCompany = {
  id: string;
  name: string | null;
  email: string;
  businessName: string | null;
};

type CustomerResponse = {
  customers?: CustomerCompany[];
};

type OrdersResponse = OrderRecord[];

function dedupeCustomersFromOrders(orders: OrdersResponse): CustomerCompany[] {
  const map = new Map<string, CustomerCompany>();
  for (const order of orders) {
    const user = order.user;
    if (!user?.id || !user?.email) {
      continue;
    }
    if (!map.has(user.id)) {
      map.set(user.id, {
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        businessName: user.businessName ?? null,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const aLabel = (a.businessName || a.name || a.email).toLowerCase();
    const bLabel = (b.businessName || b.name || b.email).toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
}

export async function fetchCustomerCompanies(
  headers: Record<string, string>
): Promise<CustomerCompany[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/users/customers`, { headers });
  const result = (await response.json().catch(() => ({}))) as CustomerResponse & { error?: string };

  if (response.ok) {
    return Array.isArray(result.customers) ? result.customers : [];
  }

  // Fallback for environments where /api/users/customers is not available yet.
  const fallbackResponse = await fetch(`${BACKEND_BASE_URL}/api/orders`, { headers });
  if (!fallbackResponse.ok) {
    const fallbackResult = (await fallbackResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(result?.error || fallbackResult?.error || 'Failed to load customers.');
  }

  const orders = (await fallbackResponse.json().catch(() => [])) as OrdersResponse;
  return dedupeCustomersFromOrders(Array.isArray(orders) ? orders : []);
}

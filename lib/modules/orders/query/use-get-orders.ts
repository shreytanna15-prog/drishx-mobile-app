import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import { fetchOrders, type OrderRecord } from '@/lib/orders-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Gold-standard orders query (drishx-client-api).
 * Wraps existing fetchOrders — screens never call apiFetch directly.
 */
export function useGetOrders(options?: QueryOptions<OrderRecord[]>) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getOrders,
    () => fetchOrders(getAuthHeaders()),
    [],
    options,
  );
}

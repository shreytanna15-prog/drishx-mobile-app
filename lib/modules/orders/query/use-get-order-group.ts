import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import { fetchOrdersForGroup } from '@/lib/orders-api';
import type { QueryOptions } from '@/lib/types/api-client';
import type { OrderRecord } from '@/lib/orders-api';

/** Resolve checkout-batch siblings for order detail screens. */
export function useGetOrderGroup(
  groupKey: string | undefined,
  options?: QueryOptions<OrderRecord[]>
) {
  const { getAuthHeaders } = useAuth();
  const key = groupKey?.trim() ?? '';

  return useApiQuery(
    QUERY_REGISTRY.getOrderGroup,
    () => fetchOrdersForGroup(key, getAuthHeaders()),
    [key],
    {
      ...options,
      enabled: Boolean(key) && (options?.enabled ?? true),
    },
  );
}

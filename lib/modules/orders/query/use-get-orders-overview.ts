import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  fetchOrdersOverview,
  type OrdersOverview,
} from '@/lib/orders-api';
import type { QueryOptions } from '@/lib/types/api-client';
import { useAuth } from '@/lib/auth';

export function useGetOrdersOverview(options?: QueryOptions<OrdersOverview>) {
  const { getAuthHeaders } = useAuth();
  return useApiQuery(
    QUERY_REGISTRY.getOrdersOverview,
    () => fetchOrdersOverview(getAuthHeaders()),
    [],
    options
  );
}

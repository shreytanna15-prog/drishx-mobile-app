import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchReturnRequests,
  type ListReturnsParams,
  type PaginatedReturns,
} from '@/lib/returns-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Paginated returns list (RW-11 Phase C).
 */
export function useGetReturnRequests(
  params?: ListReturnsParams,
  options?: QueryOptions<PaginatedReturns>,
) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getReturnRequests,
    () => fetchReturnRequests(getAuthHeaders(), params),
    [
      params?.page,
      params?.limit,
      params?.status,
      params?.orderId,
      params?.q,
      params?.requestType,
    ],
    options,
  );
}

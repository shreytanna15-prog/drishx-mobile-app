import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchReturnRequests,
  type ReturnRequestRecord,
} from '@/lib/returns-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Returns list query (drishx-client-api).
 * Wraps existing fetchReturnRequests — screens never call apiFetch directly.
 */
export function useGetReturnRequests(
  options?: QueryOptions<ReturnRequestRecord[]>,
) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getReturnRequests,
    () => fetchReturnRequests(getAuthHeaders()),
    [],
    options,
  );
}

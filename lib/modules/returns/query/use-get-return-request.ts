import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchReturnRequest,
  type ReturnRequestRecord,
} from '@/lib/returns-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Return-request-by-id query (drishx-client-api).
 * Wraps existing fetchReturnRequest — screens never call apiFetch directly.
 */
export function useGetReturnRequest(
  returnId: string | undefined,
  options?: QueryOptions<ReturnRequestRecord>,
) {
  const { getAuthHeaders } = useAuth();
  const enabled = Boolean(returnId) && (options?.enabled ?? true);

  return useApiQuery(
    QUERY_REGISTRY.getReturnRequest,
    () => fetchReturnRequest(returnId!, getAuthHeaders()),
    [returnId],
    {
      ...options,
      enabled,
    },
  );
}

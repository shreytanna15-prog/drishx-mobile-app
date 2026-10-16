import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchProcurementHistory,
  type ProcurementRecord,
} from '@/lib/procurement-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Gold-standard procurement history query (drishx-client-api).
 * Wraps existing fetchProcurementHistory — screens never call apiFetch directly.
 */
export function useGetProcurementOrders(
  options?: QueryOptions<ProcurementRecord[]>,
) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getProcurementOrders,
    () => fetchProcurementHistory(getAuthHeaders()),
    [],
    options,
  );
}

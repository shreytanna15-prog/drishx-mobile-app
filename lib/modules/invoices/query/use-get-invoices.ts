import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchInvoices,
  type ListInvoicesParams,
  type PaginatedInvoices,
} from '@/lib/invoices-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Paginated invoices list (RW-11 Phase C).
 */
export function useGetInvoices(
  params?: ListInvoicesParams,
  options?: QueryOptions<PaginatedInvoices>,
) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getInvoices,
    () => fetchInvoices(getAuthHeaders(), params),
    [
      params?.page,
      params?.limit,
      params?.status,
      params?.q,
      params?.dateFrom,
      params?.dateTo,
    ],
    options,
  );
}

import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useAuth } from '@/lib/auth';
import {
  fetchInvoices,
  type InvoiceRecord,
} from '@/lib/invoices-api';
import type { QueryOptions } from '@/lib/types/api-client';

/**
 * Invoices list query (drishx-client-api).
 * Wraps existing fetchInvoices — screens never call apiFetch directly.
 */
export function useGetInvoices(options?: QueryOptions<InvoiceRecord[]>) {
  const { getAuthHeaders } = useAuth();

  return useApiQuery(
    QUERY_REGISTRY.getInvoices,
    () => fetchInvoices(getAuthHeaders()),
    [],
    options,
  );
}

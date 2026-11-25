import { fetchCatalogPowers } from '@/lib/catalog-stock-api';
import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';

export function useGetCatalogPowers(params: { q?: string; page?: number; limit?: number }) {
  return useApiQuery(QUERY_REGISTRY.getCatalogPowers,
    () => fetchCatalogPowers(params),
    [params.q, params.page, params.limit]);
}

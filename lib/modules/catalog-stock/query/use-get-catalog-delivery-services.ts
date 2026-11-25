import { fetchCatalogDeliveryServices } from '@/lib/catalog-stock-api';
import { QUERY_REGISTRY } from '@/lib/constants/api-registry';
import { useApiQuery } from '@/lib/hooks/use-api-query';

export function useGetCatalogDeliveryServices() {
  return useApiQuery(QUERY_REGISTRY.getCatalogDeliveryServices,
    fetchCatalogDeliveryServices, []);
}

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '../../api/sitesApi';
import { queryKeys } from './queryKeys';

export const useSite = (siteId) =>
  useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: () => sitesApi.getSite(siteId),
    enabled: !!siteId,
  });

export const useSiteReports = (siteId) =>
  useInfiniteQuery({
    queryKey: queryKeys.sites.reports(siteId),
    queryFn: ({ pageParam }) => sitesApi.getReportPage(siteId, { cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!siteId,
  });

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sitesApi.createSite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.my.all }),
  });
}

export function useSetSiteMaterials(siteId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materials) => sitesApi.setSiteMaterials(siteId, materials),
    onSuccess: (site) => {
      queryClient.setQueryData(queryKeys.sites.detail(siteId), site);
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
    },
  });
}

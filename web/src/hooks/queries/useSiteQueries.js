import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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

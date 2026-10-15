import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { hqApi } from '../../api/hqApi';
import { queryKeys } from './queryKeys';

// 웹은 푸시 알림이 없으므로 일정 주기로 다시 불러 '새 보고'를 반영한다.
const LIVE_REFETCH_MS = 30_000;

export const useHqInfo = () =>
  useQuery({ queryKey: queryKeys.hq.info(), queryFn: hqApi.getInfo, staleTime: 5 * 60_000 });

export const useHqSites = () =>
  useQuery({
    queryKey: queryKeys.hq.sites(),
    queryFn: hqApi.getSites,
    refetchInterval: LIVE_REFETCH_MS,
  });

// 연결된 모든 현장의 보고 (최신순, 30건씩)
export const useHqReports = () =>
  useInfiniteQuery({
    queryKey: queryKeys.hq.reports(),
    queryFn: ({ pageParam }) => hqApi.getReportPage({ cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: LIVE_REFETCH_MS,
  });

// 무한 쿼리 결과를 평평한 배열로
export const flattenPages = (data) => data?.pages.flatMap((p) => p.items) ?? [];

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../../api/reportsApi';
import { queryKeys } from './queryKeys';

// 보고 목록 캐시(무한 쿼리) 안의 보고 하나를 서버 응답으로 교체
const replaceInPages = (updated) => (data) =>
  data?.pages
    ? {
        ...data,
        pages: data.pages.map((p) => ({
          ...p,
          items: p.items.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        })),
      }
    : data;

// 승인 / 보완 요청
export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status, comment }) => reportsApi.review(reportId, { status, comment }),
    onSuccess: (updated) => {
      // 1) 응답으로 캐시 즉시 갱신 → 재조회 전에도 같은 보고를 두 번 처리하지 않게
      queryClient.setQueriesData({ queryKey: queryKeys.hq.reports() }, replaceInPages(updated));
      queryClient.setQueriesData({ queryKey: queryKeys.sites.reports(updated.siteId) }, replaceInPages(updated));
      // 2) 검토 대기 수·진행률 등 서버 계산값은 다시 불러온다
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
    },
  });
}

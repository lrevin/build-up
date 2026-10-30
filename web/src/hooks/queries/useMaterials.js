import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '../../api/materialsApi';
import { queryKeys } from './queryKeys';

export const useHqMaterials = () =>
  useQuery({
    queryKey: queryKeys.hq.materials(),
    queryFn: materialsApi.getHqMaterials,
    refetchInterval: 30_000,
  });

// 처리 전 본인 요청 취소
export function useCancelMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId }) => materialsApi.cancel(requestId),
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.materials(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
    },
  });
}

// 자재 요청 승인 / 반려
export function useSetMaterialStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status, reason }) => materialsApi.setStatus(requestId, { status, reason }),
    onSuccess: (updated) => {
      // 응답으로 즉시 교체 → 같은 요청을 두 번 처리하지 않게
      const replace = (list) =>
        Array.isArray(list) ? list.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)) : list;
      queryClient.setQueriesData({ queryKey: queryKeys.hq.materials() }, replace);
      queryClient.setQueriesData({ queryKey: queryKeys.sites.materials(updated.siteId) }, replace);
      // 현장별 대기 수 갱신 (관리자 페이지 · 사용자 페이지)
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.materials(updated.siteId) });
    },
  });
}

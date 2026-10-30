import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '../../api/sitesApi';
import { reportsApi } from '../../api/reportsApi';
import { queryKeys } from './queryKeys';

// 사용자 페이지(현장 관리자 · 작업자)용 훅

export const useMySites = () =>
  useQuery({ queryKey: queryKeys.my.sites(), queryFn: sitesApi.getMySites, refetchInterval: 30_000 });

export const useSiteMaterials = (siteId) =>
  useQuery({
    queryKey: queryKeys.sites.materials(siteId),
    queryFn: () => sitesApi.getMaterials(siteId),
    enabled: !!siteId,
  });

export function useCreateMaterialRequest(siteId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => sitesApi.createMaterialRequest(siteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.materials(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
    },
  });
}

// 참여 코드로 현장 참여 → 내 현장 목록 다시 불러오기
export function useJoinSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) => sitesApi.joinSite(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.my.all }),
  });
}

// 보고 제출 → 현장 목록·보고 목록·본사 화면 모두 다시 불러온다
export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, input }) => sitesApi.createReport(siteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
    },
  });
}

// 작성자: 메모 수정(보완 요청 받은 보고 → 다시 검토 대기)
export function useUpdateMemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, memo }) => reportsApi.updateMemo(reportId, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
    },
  });
}

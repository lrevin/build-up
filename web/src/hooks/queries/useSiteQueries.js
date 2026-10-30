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

// ───── 현장 설정(현장 총관리자) ─────
// 현장 정보가 바뀌면 상세 캐시를 응답으로 바꾸고, 목록(내 현장 · 본사)은 다시 불러온다
function useSiteMutation(siteId, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (site) => {
      if (site && typeof site === 'object' && site.id) queryClient.setQueryData(queryKeys.sites.detail(siteId), site);
      else queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
    },
  });
}

export const useUpdateSite = (siteId) => useSiteMutation(siteId, (input) => sitesApi.updateSite(siteId, input));
export const useSetProgressMode = (siteId) => useSiteMutation(siteId, (input) => sitesApi.setProgressMode(siteId, input));
export const useSetSiteLocation = (siteId) => useSiteMutation(siteId, (point) => sitesApi.setLocation(siteId, point));
export const useLinkCompany = (siteId) => useSiteMutation(siteId, (code) => sitesApi.linkCompany(siteId, code));
export const useUnlinkCompany = (siteId) => useSiteMutation(siteId, () => sitesApi.unlinkCompany(siteId));
export const useRegenerateCode = (siteId) => useSiteMutation(siteId, () => sitesApi.regenerateCode(siteId));

// 현장 삭제 · 나가기: 목록만 다시 불러온다(상세 캐시는 버림)
function useSiteGone(siteId, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['sites', siteId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.hq.all });
    },
  });
}

export const useDeleteSite = (siteId) => useSiteGone(siteId, () => sitesApi.deleteSite(siteId));
export const useLeaveSite = (siteId) => useSiteGone(siteId, () => sitesApi.leaveSite(siteId));

// ───── 참여자 ─────
export const useSiteMembers = (siteId) =>
  useQuery({
    queryKey: queryKeys.sites.members(siteId),
    queryFn: () => sitesApi.getMembers(siteId),
    enabled: !!siteId,
  });

export function useRemoveMember(siteId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => sitesApi.removeMember(siteId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.members(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.my.all });
    },
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

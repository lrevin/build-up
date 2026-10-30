// React Query 캐시 키를 한 곳에서 관리 (무효화 범위를 정확히 지정하기 위해)
export const queryKeys = {
  hq: {
    all: ['hq'],
    info: () => ['hq', 'info'],
    sites: () => ['hq', 'sites'],
    reports: () => ['hq', 'reports'],
    materials: () => ['hq', 'materials'],
  },
  my: {
    all: ['my'],
    sites: () => ['my', 'sites'],
  },
  sites: {
    all: ['sites'],
    detail: (siteId) => ['sites', siteId, 'detail'],
    reports: (siteId) => ['sites', siteId, 'reports'],
    materials: (siteId) => ['sites', siteId, 'materials'],
    members: (siteId) => ['sites', siteId, 'members'],
  },
};

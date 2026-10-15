// 기준: SecurityConfig.java(/api prefix, 공개 경로) + 모바일 api/buildup.ts 경로.
// baseURL이 '/api'이므로 여기엔 '/api' 이후만 쓴다.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login', // 공개
    REFRESH: '/auth/refresh', // 공개
    LOGOUT: '/auth/logout', // 공개
    ME: '/auth/me',
  },
  HQ: {
    INFO: '/hq', // HqInfo
    SITES: '/hq/sites', // SiteSummary[]
    REPORT_PAGE: '/hq/reports/page', // ReportPage  ?cursor=&size=
  },
  SITES: {
    DETAIL: (siteId) => `/sites/${siteId}`, // Site
    REPORT_PAGE: (siteId) => `/sites/${siteId}/reports/page`, // ReportPage  ?cursor=&size=
  },
  REPORTS: {
    REVIEW: (reportId) => `/reports/${reportId}/review`, // PATCH { status, comment } → Report
  },
};

// 백엔드 AuthService.refresh 존재 확인됨
export const USE_REFRESH_TOKEN = true;

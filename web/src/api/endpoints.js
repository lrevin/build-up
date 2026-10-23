// 기준: docs/API_약속.md + 모바일 api/buildup.ts 경로. 서버 주소 앞부분은 /api.
// baseURL이 '/api'이므로 여기엔 '/api' 이후만 쓴다.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login', // POST { email, password } → { user, accessToken, refreshToken, ... }
    REFRESH: '/auth/refresh', // POST { refreshToken } → 로그인과 같은 모양
    LOGOUT: '/auth/logout', // POST { refreshToken }
    ME: '/auth/me', // GET → user
  },
  HQ: {
    INFO: '/hq', // HqInfo
    SITES: '/hq/sites', // SiteSummary[]
    REPORT_PAGE: '/hq/reports/page', // ReportPage  ?cursor=&size=
    MATERIALS: '/hq/materials', // MaterialRequest[]
  },
  SITES: {
    DETAIL: (siteId) => `/sites/${siteId}`, // Site
    REPORT_PAGE: (siteId) => `/sites/${siteId}/reports/page`, // ReportPage  ?cursor=&size=
    WORKLOG_LINK: (siteId) => `/sites/${siteId}/worklog/link`, // POST ?from=&to= → { url } (10분 유효)
  },
  REPORTS: {
    REVIEW: (reportId) => `/reports/${reportId}/review`, // PATCH { status, comment } → Report
  },
  MATERIALS: {
    STATUS: (requestId) => `/materials/${requestId}/status`, // PATCH { status, reason } → MaterialRequest
  },
};

export const USE_REFRESH_TOKEN = true;

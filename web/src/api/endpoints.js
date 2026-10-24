// 기준: docs/API_약속.md + 모바일 api/buildup.ts 경로. 서버 주소 앞부분은 /api.
// baseURL이 '/api'이므로 여기엔 '/api' 이후만 쓴다.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login', // POST { email, password } → { user, accessToken, refreshToken, ... }
    SIGNUP: '/auth/signup', // POST SignUpRequest { role, name, email, phone, password, company?, companyCode? } → 로그인과 같은 모양
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
    MINE: '/sites', // GET → SiteSummary[] (내가 참여한 현장)
    PREVIEW: (code) => `/sites/code/${code}`, // GET → SitePreview { id, name, address, ownerName, memberCount, alreadyJoined }
    JOIN: '/sites/join', // POST { code: 6자리 } → SiteSummary (참여 코드로 현장 참여)
    DETAIL: (siteId) => `/sites/${siteId}`, // Site
    REPORTS: (siteId) => `/sites/${siteId}/reports`, // POST multipart → Report (보고 제출)
    MATERIALS: (siteId) => `/sites/${siteId}/materials`, // GET → MaterialRequest[]
    REPORT_PAGE: (siteId) => `/sites/${siteId}/reports/page`, // ReportPage  ?cursor=&size=
    WORKLOG_LINK: (siteId) => `/sites/${siteId}/worklog/link`, // POST ?from=&to= → { url } (10분 유효)
  },
  REPORTS: {
    REVIEW: (reportId) => `/reports/${reportId}/review`, // PATCH { status, comment } → Report
    UPDATE: (reportId) => `/reports/${reportId}`, // PATCH { memo } → Report (보완 요청 받은 보고는 다시 검토 대기)
  },
  MATERIALS: {
    STATUS: (requestId) => `/materials/${requestId}/status`, // PATCH { status, reason } → MaterialRequest
  },
};

export const USE_REFRESH_TOKEN = true;

import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';
import { REPORT_PAGE_SIZE } from './hqApi';

export const sitesApi = {
  getSite: (siteId) =>
    USE_DUMMY ? mockServer.getSite(siteId) : http.get(ENDPOINTS.SITES.DETAIL(siteId)).then((r) => r.data),

  getReportPage: (siteId, { cursor = null, size = REPORT_PAGE_SIZE } = {}) => {
    if (USE_DUMMY) return mockServer.getSiteReportPage(siteId, cursor, size);
    const params = { size };
    if (cursor) params.cursor = cursor;
    return http.get(ENDPOINTS.SITES.REPORT_PAGE(siteId), { params }).then((r) => r.data);
  },

  // 작업일보 엑셀 내려받기 주소 (from/to: 'YYYY-MM-DD'). 실서버 주소는 10분간 유효
  worklogLink: (siteId, { from, to }) =>
    USE_DUMMY
      ? mockServer.worklogLink(siteId, from, to)
      : http.post(ENDPOINTS.SITES.WORKLOG_LINK(siteId), null, { params: { from, to } }).then((r) => r.data),
};

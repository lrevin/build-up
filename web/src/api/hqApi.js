import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

export const REPORT_PAGE_SIZE = 30;

// 본사 관계자 전용 API. 응답 형식은 app/types.ts (HqInfo, SiteSummary, ReportPage)
export const hqApi = {
  getInfo: () => (USE_DUMMY ? mockServer.getHqInfo() : http.get(ENDPOINTS.HQ.INFO).then((r) => r.data)),

  getSites: () =>
    USE_DUMMY ? mockServer.getHqSites() : http.get(ENDPOINTS.HQ.SITES).then((r) => r.data),

  getReportPage: ({ cursor = null, size = REPORT_PAGE_SIZE } = {}) => {
    if (USE_DUMMY) return mockServer.getHqReportPage(cursor, size);
    const params = { size };
    if (cursor) params.cursor = cursor;
    return http.get(ENDPOINTS.HQ.REPORT_PAGE, { params }).then((r) => r.data);
  },
};

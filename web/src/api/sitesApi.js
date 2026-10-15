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
};

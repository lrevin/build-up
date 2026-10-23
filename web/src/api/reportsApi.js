import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

export const reportsApi = {
  // status: 'approved' | 'revision'  (보완 요청은 comment 필수)
  // TODO(백엔드 확인): 엔티티는 APPROVED/REJECTED. 상태값 표기 확정 후 여기서 변환
  review: (reportId, { status, comment }) =>
    USE_DUMMY
      ? mockServer.reviewReport(reportId, status, comment ?? '')
      : http.patch(ENDPOINTS.REPORTS.REVIEW(reportId), { status, comment }).then((r) => r.data),
};

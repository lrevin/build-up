import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

export const reportsApi = {
  // status: 'approved' | 'revision'  (보완 요청은 comment 필수, API 약속 1번)
  review: (reportId, { status, comment }) =>
    USE_DUMMY
      ? mockServer.reviewReport(reportId, status, comment ?? '')
      : http.patch(ENDPOINTS.REPORTS.REVIEW(reportId), { status, comment }).then((r) => r.data),

  // 작성자: 메모 수정. 보완 요청 받은 보고는 서버가 다시 '검토 대기'로 돌린다
  updateMemo: (reportId, memo) =>
    USE_DUMMY
      ? mockServer.updateMemo(reportId, memo)
      : http.patch(ENDPOINTS.REPORTS.UPDATE(reportId), { memo }).then((r) => r.data),

  // 현장의 가장 최근 보고만, 작성자나 현장 관리자가 삭제(report.canDelete). 승인된 보고면 진행률·자재 재고도 되돌린다
  remove: (reportId) =>
    USE_DUMMY ? mockServer.unsupported() : http.delete(ENDPOINTS.REPORTS.UPDATE(reportId)).then((r) => r.data),
};

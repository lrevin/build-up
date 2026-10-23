import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

// 자재 요청 (상태: requested / approved / rejected)
export const materialsApi = {
  getHqMaterials: () =>
    USE_DUMMY ? mockServer.getHqMaterials() : http.get(ENDPOINTS.HQ.MATERIALS).then((r) => r.data),

  // status: 'approved' | 'rejected' (반려는 reason 필수)
  setStatus: (requestId, { status, reason }) =>
    USE_DUMMY
      ? mockServer.setMaterialStatus(requestId, status, reason)
      : http.patch(ENDPOINTS.MATERIALS.STATUS(requestId), { status, reason }).then((r) => r.data),
};

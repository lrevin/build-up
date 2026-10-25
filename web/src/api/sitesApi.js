import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';
import { REPORT_PAGE_SIZE } from './hqApi';

export const sitesApi = {
  // 내가 참여한 현장 (현장 관리자 · 작업자)
  getMySites: () => (USE_DUMMY ? mockServer.getMySites() : http.get(ENDPOINTS.SITES.MINE).then((r) => r.data)),

  // 참여 전 미리보기 (잘못된 현장에 들어가지 않게 이름·관리자 확인)
  previewSite: (code) =>
    USE_DUMMY ? mockServer.previewSite(code) : http.get(ENDPOINTS.SITES.PREVIEW(code)).then((r) => r.data),

  // 참여 코드(6자리)로 현장 참여 (현장 관리자 · 작업자. 본사 관계자는 403)
  joinSite: (code) =>
    USE_DUMMY ? mockServer.joinSite(code) : http.post(ENDPOINTS.SITES.JOIN, { code }).then((r) => r.data),

  getSite: (siteId) =>
    USE_DUMMY ? mockServer.getSite(siteId) : http.get(ENDPOINTS.SITES.DETAIL(siteId)).then((r) => r.data),

  getReportPage: (siteId, { cursor = null, size = REPORT_PAGE_SIZE } = {}) => {
    if (USE_DUMMY) return mockServer.getSiteReportPage(siteId, cursor, size);
    const params = { size };
    if (cursor) params.cursor = cursor;
    return http.get(ENDPOINTS.SITES.REPORT_PAGE(siteId), { params }).then((r) => r.data);
  },

  getMaterials: (siteId) =>
    USE_DUMMY ? mockServer.getSiteMaterials(siteId) : http.get(ENDPOINTS.SITES.MATERIALS(siteId)).then((r) => r.data),

  /**
   * 보고 제출 (서버 ReportController.create, multipart/form-data)
   * input: { work, to?, processKey?, processTo?, memo, workLog, photos: File[], files: File[], location? }
   * 사진의 촬영 시각·위치(EXIF)는 서버가 사진 파일에서 직접 읽는다 → 원본 파일을 그대로 보낸다.
   */
  createReport: (siteId, input) => {
    if (USE_DUMMY) return mockServer.createReport(siteId, input);
    const form = new FormData();
    form.append('work', input.work);
    if (input.processKey) {
      form.append('processKey', input.processKey);
      form.append('processTo', String(input.processTo));
    } else {
      form.append('to', String(input.to));
    }
    form.append('memo', input.memo ?? '');
    form.append('workLog', JSON.stringify(input.workLog));
    input.photos.forEach((f) => form.append('photos', f, f.name));
    input.files.forEach((f) => form.append('files', f, f.name));
    if (input.location) {
      form.append('latitude', String(input.location.latitude));
      form.append('longitude', String(input.location.longitude));
      if (input.location.accuracy != null) form.append('accuracy', String(input.location.accuracy));
    }
    // multipart 로 보낸다(boundary 는 브라우저가 붙임). 사진이 많으면 오래 걸리므로 시간 제한을 늘린다.
    return http
      .post(ENDPOINTS.SITES.REPORTS(siteId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      })
      .then((r) => r.data);
  },

  // 작업일보 엑셀 내려받기 주소 (from/to: 'YYYY-MM-DD'). 실서버 주소는 10분간 유효
  worklogLink: (siteId, { from, to }) =>
    USE_DUMMY
      ? mockServer.worklogLink(siteId, from, to)
      : http.post(ENDPOINTS.SITES.WORKLOG_LINK(siteId), null, { params: { from, to } }).then((r) => r.data),
};

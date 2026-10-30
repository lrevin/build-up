import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';
import { REPORT_PAGE_SIZE } from './hqApi';

export const sitesApi = {
  // 내가 참여한 현장 (현장 관리자 · 작업자)
  getMySites: () => (USE_DUMMY ? mockServer.getMySites() : http.get(ENDPOINTS.SITES.MINE).then((r) => r.data)),

  createSite: (input) =>
    USE_DUMMY ? mockServer.createSite(input) : http.post(ENDPOINTS.SITES.CREATE, input).then((r) => r.data),

  // 참여 전 미리보기 (잘못된 현장에 들어가지 않게 이름·관리자 확인)
  previewSite: (code) =>
    USE_DUMMY ? mockServer.previewSite(code) : http.get(ENDPOINTS.SITES.PREVIEW(code)).then((r) => r.data),

  // 참여 코드(6자리)로 현장 참여 (현장 관리자 · 작업자. 본사 관계자는 403)
  joinSite: (code) =>
    USE_DUMMY ? mockServer.joinSite(code) : http.post(ENDPOINTS.SITES.JOIN, { code }).then((r) => r.data),

  getSite: (siteId) =>
    USE_DUMMY ? mockServer.getSite(siteId) : http.get(ENDPOINTS.SITES.DETAIL(siteId)).then((r) => r.data),

  setSiteMaterials: (siteId, materials) =>
    USE_DUMMY
      ? mockServer.setSiteMaterials(siteId, materials)
      : http.put(ENDPOINTS.SITES.STOCK(siteId), { materials }).then((r) => r.data),

  getReportPage: (siteId, { cursor = null, size = REPORT_PAGE_SIZE } = {}) => {
    if (USE_DUMMY) return mockServer.getSiteReportPage(siteId, cursor, size);
    const params = { size };
    if (cursor) params.cursor = cursor;
    return http.get(ENDPOINTS.SITES.REPORT_PAGE(siteId), { params }).then((r) => r.data);
  },

  getMaterials: (siteId) =>
    USE_DUMMY ? mockServer.getSiteMaterials(siteId) : http.get(ENDPOINTS.SITES.MATERIALS(siteId)).then((r) => r.data),

  createMaterialRequest: (siteId, input) =>
    USE_DUMMY
      ? mockServer.createMaterialRequest(siteId, input)
      : http.post(ENDPOINTS.SITES.MATERIALS(siteId), input).then((r) => r.data),

  /**
   * 보고 제출 (서버 ReportController.create, multipart/form-data)
   * input: { work, to?, processKey?, processTo?, memo, workLog, photos: File[], photoPhases: string[], rating?, materials?, files: File[], location? }
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
    input.photos.forEach((f, index) => {
      form.append('photos', f, f.name);
      form.append('photoPhases', input.photoPhases?.[index] ?? 'after');
    });
    if (input.rating != null) form.append('rating', String(input.rating));
    if (input.materials?.length) form.append('materials', JSON.stringify(input.materials));
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

  // ───── 현장 설정(현장 총관리자) · 참여자 — 앱의 '현장 설정' · '참여자' 화면과 같은 기능 ─────
  updateSite: (siteId, input) =>
    USE_DUMMY ? mockServer.unsupported() : http.patch(ENDPOINTS.SITES.DETAIL(siteId), input).then((r) => r.data),

  setProgressMode: (siteId, { mode, processes }) =>
    USE_DUMMY
      ? mockServer.unsupported()
      : http.put(ENDPOINTS.SITES.PROGRESS_MODE(siteId), { mode, processes }).then((r) => r.data),

  deleteSite: (siteId) =>
    USE_DUMMY ? mockServer.unsupported() : http.delete(ENDPOINTS.SITES.DETAIL(siteId)).then((r) => r.data),

  regenerateCode: (siteId) =>
    USE_DUMMY ? mockServer.unsupported() : http.post(ENDPOINTS.SITES.CODE(siteId)).then((r) => r.data.code),

  // point: { latitude, longitude } 또는 null(지우기)
  setLocation: (siteId, point) =>
    USE_DUMMY
      ? mockServer.unsupported()
      : http
          .put(ENDPOINTS.SITES.LOCATION(siteId), { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null })
          .then((r) => r.data),

  previewCompany: (code) =>
    USE_DUMMY ? mockServer.unsupported() : http.get(ENDPOINTS.COMPANIES.PREVIEW(code)).then((r) => r.data.name),

  linkCompany: (siteId, code) =>
    USE_DUMMY ? mockServer.unsupported() : http.put(ENDPOINTS.SITES.HQ_LINK(siteId), { code }).then((r) => r.data),

  unlinkCompany: (siteId) =>
    USE_DUMMY ? mockServer.unsupported() : http.delete(ENDPOINTS.SITES.HQ_LINK(siteId)).then((r) => r.data),

  getMembers: (siteId) =>
    USE_DUMMY ? mockServer.unsupported() : http.get(ENDPOINTS.SITES.MEMBERS(siteId)).then((r) => r.data),

  removeMember: (siteId, memberId) =>
    USE_DUMMY ? mockServer.unsupported() : http.delete(ENDPOINTS.SITES.MEMBER(siteId, memberId)).then((r) => r.data),

  leaveSite: (siteId) =>
    USE_DUMMY ? mockServer.unsupported() : http.delete(ENDPOINTS.SITES.LEAVE(siteId)).then((r) => r.data),

  // 작업일보 엑셀 내려받기 주소 (from/to: 'YYYY-MM-DD'). 실서버 주소는 10분간 유효
  worklogLink: (siteId, { from, to }) =>
    USE_DUMMY
      ? mockServer.worklogLink(siteId, from, to)
      : http.post(ENDPOINTS.SITES.WORKLOG_LINK(siteId), null, { params: { from, to } }).then((r) => r.data),
};

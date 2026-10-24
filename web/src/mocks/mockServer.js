// 서버 없이 동작하는 가짜 API. 실제 API와 같은 함수 모양·응답 형식·오류 형식을 지킨다.
// 권한 규칙은 docs/API_약속.md 와 app/dummy.ts(= 서버 규칙)에 맞춘다.
import { createSeed, DEMO_PASSWORD } from './seed';
import { tokenStorage } from '../services/tokenStorage';

const db = createSeed();

const DELAY_MS = 250;
const delay = (ms = DELAY_MS) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

// 오류 응답: API 약속 4번 { message } + HTTP 상태 코드
const apiError = (status, message) => ({ isNormalized: true, status, code: null, message });

async function respond(fn) {
  await delay();
  return clone(fn());
}

// ───────── 인증 ─────────
const TOKEN_PREFIX = 'dummy-access.';

function publicUser(u) {
  const { hqCompanyId, ...rest } = u;
  void hqCompanyId;
  return rest;
}

function currentUser() {
  const token = tokenStorage.getAccessToken();
  const id = token?.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
  const user = db.users.find((u) => u.id === id);
  if (!user) throw apiError(401, '로그인이 필요합니다.');
  return user;
}

function tokenResponse(user) {
  const now = Date.now();
  return {
    user: publicUser(user),
    tokenType: 'Bearer',
    accessToken: `${TOKEN_PREFIX}${user.id}`,
    refreshToken: `dummy-refresh.${user.id}`,
    accessTokenExpiresAt: new Date(now + 60 * 60_000).toISOString(),
    refreshTokenExpiresAt: new Date(now + 30 * 86_400_000).toISOString(),
  };
}

// ───────── 권한 ─────────
const isHqOf = (user, site) => user.role === 'hq' && !!site.companyId && user.hqCompanyId === site.companyId;
// 본사 쪽 검토·자재 승인 권한: 본사 관리자만 (API 약속 2번 canReviewReports)
const canHqReview = (user, site) => isHqOf(user, site) && user.canReviewReports;

// 본사 화면(/api/hq/*): 본사 관계자만 (서버 HqService 와 같음)
function hqSites(user) {
  if (user.role !== 'hq') throw apiError(403, '본사 관계자만 볼 수 있어요.');
  return db.sites.filter((s) => isHqOf(user, s));
}

// 내가 참여한 현장 (현장 관리자 · 작업자)
const isMember = (user, site) => site.ownerId === user.id || site.memberIds.includes(user.id);
const memberSites = (user) => db.sites.filter((s) => isMember(user, s));

// 현장 상세·보고 조회: 참여자 또는 연결된 본사
function findVisibleSite(user, siteId) {
  const site = db.sites.find((s) => s.id === siteId);
  if (!site || !(isMember(user, site) || isHqOf(user, site))) throw apiError(404, '현장을 찾을 수 없습니다.');
  return site;
}

function findMemberSite(user, siteId) {
  const site = db.sites.find((s) => s.id === siteId);
  if (!site || !isMember(user, site)) throw apiError(403, '이 현장에 참여한 사람만 보고할 수 있어요.');
  return site;
}

const siteById = (id) => db.sites.find((s) => s.id === id);
const userName = (id) => db.users.find((u) => u.id === id)?.name ?? '-';
const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
const reportsOf = (siteId) => db.reports.filter((r) => r.siteId === siteId).sort(byNewest);

function withPermissions(user, row) {
  const site = siteById(row.siteId);
  const canReview =
    row.review.status === 'pending' && row.authorId !== user.id && (site.ownerId === user.id || canHqReview(user, site));
  return { ...row, siteName: site.name, canEdit: row.authorId === user.id, canDelete: false, canReview };
}

// 자동 계산 현장의 공정별 현재 진행률 = 그 공정의 가장 최근 보고 값
function processesOf(site) {
  if (site.progressMode !== 'auto') return [];
  const reports = reportsOf(site.id);
  return site.processes.map((p) => {
    const last = reports.find((r) => r.processKey === p.key);
    return {
      key: p.key,
      name: p.name,
      weight: p.weight,
      progress: last?.processTo ?? p.start,
      lastReportedAt: last?.createdAt ?? null,
    };
  });
}

function summary(user, s) {
  const reports = reportsOf(s.id);
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    ownerName: userName(s.ownerId),
    memberCount: s.memberIds.length,
    overallProgress: reports[0]?.to ?? 0,
    isOwner: s.ownerId === user.id,
    workType: s.workType,
    lastReportedAt: reports[0]?.createdAt ?? null,
    hqName: db.companies.find((c) => c.id === s.companyId)?.name ?? null,
    pendingMaterials: db.materials.filter((m) => m.siteId === s.id && m.status === 'requested').length,
    pendingReviews: reports.filter((r) => withPermissions(user, r).canReview).length,
    progressMode: s.progressMode,
  };
}

function withMaterialPermissions(user, m) {
  const site = siteById(m.siteId);
  const open = m.status === 'requested';
  const canDecide = open && (site.ownerId === user.id || canHqReview(user, site));
  return {
    ...m,
    siteName: site.name,
    hqLinked: !!site.companyId,
    canCancel: false,
    canApprove: canDecide,
    canReject: canDecide,
  };
}

// cursor = 다음 시작 인덱스 (실서버는 불투명 문자열로 취급)
function pageOf(list, cursor, size) {
  const start = cursor ? Number(cursor) : 0;
  const items = list.slice(start, start + size);
  const next = start + size < list.length ? String(start + size) : null;
  return { items, nextCursor: next, total: start === 0 ? list.length : null };
}

// 작업일보: 실서버는 엑셀 내려받기 주소를 주지만, 더미는 엑셀에서 열리는 CSV를 만든다
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const WEATHER = { sunny: '맑음', cloudy: '흐림', rain: '비', snow: '눈' };
const REVIEW = { pending: '검토 대기', approved: '승인', revision: '보완 요청' };

function worklogCsv(site, from, to) {
  const inRange = (iso) => {
    const d = new Date(iso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key >= from && key <= to;
  };
  const rows = reportsOf(site.id)
    .filter((r) => inRange(r.createdAt))
    .reverse()
    .map((r) => {
      const d = new Date(r.createdAt);
      return [
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        r.author,
        r.processName || '',
        r.work,
        r.from,
        r.to,
        WEATHER[r.workLog?.weather] ?? '',
        r.workLog?.workers ?? '',
        r.workLog?.equipment ?? '',
        r.photos?.length ?? 0,
        r.memo,
        REVIEW[r.review?.status] ?? '',
        r.review?.comment ?? '',
      ];
    });
  const header = ['날짜', '시각', '작성자', '공정', '진행한 작업', '보고 전 진행률(%)', '보고 후 진행률(%)', '날씨', '투입 인원', '장비', '사진 수', '메모', '검토 상태', '검토 코멘트'];
  const body = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return { csv: `﻿${body}`, count: rows.length }; // BOM: 엑셀에서 한글 깨짐 방지
}

export const mockServer = {
  login: (email, password) =>
    respond(() => {
      const user = db.users.find((u) => u.email === String(email).trim().toLowerCase());
      if (!user || password !== DEMO_PASSWORD) throw apiError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
      return tokenResponse(user);
    }),

  me: () => respond(() => publicUser(currentUser())),

  getHqInfo: () =>
    respond(() => {
      const user = currentUser();
      const company = db.companies.find((c) => c.id === user.hqCompanyId);
      return {
        name: company?.name ?? 'Build Up',
        code: company?.code ?? '',
        siteCount: hqSites(user).length,
        staff: db.users.filter((u) => company && u.hqCompanyId === company.id).map((u) => u.name),
      };
    }),

  getHqSites: () =>
    respond(() => {
      const user = currentUser();
      return hqSites(user).map((s) => summary(user, s));
    }),

  getMySites: () =>
    respond(() => {
      const user = currentUser();
      return memberSites(user).map((s) => summary(user, s));
    }),

  getHqReportPage: (cursor, size) =>
    respond(() => {
      const user = currentUser();
      const ids = new Set(hqSites(user).map((s) => s.id));
      const list = db.reports
        .filter((r) => ids.has(r.siteId))
        .sort(byNewest)
        .map((r) => withPermissions(user, r));
      return { ...pageOf(list, cursor, size), total: null };
    }),

  getSite: (siteId) =>
    respond(() => {
      const user = currentUser();
      const s = findVisibleSite(user, siteId);
      const sum = summary(user, s);
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        ownerId: s.ownerId,
        ownerName: sum.ownerName,
        code: null, // 참여 코드는 현장 총관리자에게만
        memberCount: sum.memberCount,
        overallProgress: sum.overallProgress,
        workType: s.workType,
        lastReportedAt: sum.lastReportedAt,
        hqName: sum.hqName,
        latitude: s.latitude,
        longitude: s.longitude,
        progressMode: s.progressMode,
        processes: processesOf(s),
      };
    }),

  getSiteReportPage: (siteId, cursor, size) =>
    respond(() => {
      const user = currentUser();
      findVisibleSite(user, siteId);
      return pageOf(reportsOf(siteId).map((r) => withPermissions(user, r)), cursor, size);
    }),

  reviewReport: (reportId, status, comment) =>
    respond(() => {
      const user = currentUser();
      const row = db.reports.find((r) => r.id === reportId);
      if (!row) throw apiError(404, '보고를 찾을 수 없습니다.');
      findVisibleSite(user, row.siteId);
      if (!['approved', 'revision'].includes(status)) throw apiError(400, '알 수 없는 검토 상태입니다.');
      const text = String(comment ?? '').trim();
      if (status === 'revision' && !text) throw apiError(400, '무엇을 보완해야 하는지 코멘트를 적어 주세요.');
      if (text.length > 500) throw apiError(400, '코멘트는 500자까지 쓸 수 있어요.');
      if (!withPermissions(user, row).canReview) {
        throw apiError(
          row.review.status !== 'pending' ? 409 : 403,
          row.review.status !== 'pending'
            ? '이미 검토한 보고예요. 목록을 새로고침해 주세요.'
            : '현장 총관리자나 본사 관리자만 검토할 수 있어요.',
        );
      }
      row.review = { status, comment: text || null, reviewer: user.name, reviewedAt: new Date().toISOString() };
      return withPermissions(user, row);
    }),

  getHqMaterials: () =>
    respond(() => {
      const user = currentUser();
      const ids = new Set(hqSites(user).map((s) => s.id));
      return db.materials
        .filter((m) => ids.has(m.siteId))
        .sort(byNewest)
        .map((m) => withMaterialPermissions(user, m));
    }),

  setMaterialStatus: (requestId, status, reason) =>
    respond(() => {
      const user = currentUser();
      const m = db.materials.find((x) => x.id === requestId);
      if (!m) throw apiError(404, '자재 요청을 찾을 수 없습니다.');
      findVisibleSite(user, m.siteId);
      if (!['approved', 'rejected'].includes(status)) throw apiError(400, '알 수 없는 처리 상태입니다.');
      const why = String(reason ?? '').trim();
      if (status === 'rejected' && !why) throw apiError(400, '반려 사유를 골라 주세요.');
      const perm = withMaterialPermissions(user, m);
      if (!perm.canApprove) {
        throw apiError(
          m.status !== 'requested' ? 409 : 403,
          m.status !== 'requested' ? '이미 처리한 요청이에요. 목록을 새로고침해 주세요.' : '본사 관리자만 처리할 수 있어요.',
        );
      }
      const at = new Date().toISOString();
      m.status = status;
      m.rejectReason = status === 'rejected' ? why : null;
      m.timeline.push({ status, by: user.name, byHq: user.role === 'hq', at });
      return withMaterialPermissions(user, m);
    }),

  getSiteMaterials: (siteId) =>
    respond(() => {
      const user = currentUser();
      findVisibleSite(user, siteId);
      return db.materials
        .filter((m) => m.siteId === siteId)
        .sort(byNewest)
        .map((m) => withMaterialPermissions(user, m));
    }),

  // 실서버: POST /sites/{id}/reports (multipart). 더미는 사진을 브라우저 안 주소(blob:)로만 보관한다
  createReport: async (siteId, input) => {
    await delay(600);
    const user = currentUser();
    const site = findMemberSite(user, siteId);
    let work = String(input.work ?? '').trim();
    if (work.length > 100) throw apiError(400, '진행한 작업은 100자까지 쓸 수 있어요.');
    const current = reportsOf(site.id)[0]?.to ?? 0;
    let processFields = { processKey: 'work', processName: work.slice(0, 30), processFrom: null, processTo: null };
    let to;
    if (site.progressMode === 'auto') {
      const procs = processesOf(site);
      const p = procs.find((x) => x.key === input.processKey);
      if (!p) throw apiError(400, '보고할 공정을 골라 주세요.');
      const pTo = Number(input.processTo);
      if (!Number.isFinite(pTo) || pTo < p.progress || pTo > 100) {
        throw apiError(400, `'${p.name}' 진행률은 지금 값(${p.progress}%) 이상, 100% 이하여야 해요.`);
      }
      if (!work) work = `${p.name} 작업`;
      const after = procs.map((x) => (x.key === p.key ? { ...x, progress: pTo } : x));
      to = Math.max(current, Math.round(after.reduce((sum, x) => sum + (x.weight * x.progress) / 100, 0) * 10) / 10);
      processFields = { processKey: p.key, processName: p.name, processFrom: p.progress, processTo: Math.round(pTo * 10) / 10 };
    } else {
      if (!work) throw apiError(400, '진행한 작업을 입력해 주세요.');
      to = Number(input.to);
      if (!Number.isFinite(to) || to < current || to > 100) {
        throw apiError(400, `진행률은 지금 진행률(${current}%) 이상, 100% 이하여야 해요.`);
      }
      to = Math.round(to * 10) / 10;
    }
    if ((input.photos?.length ?? 0) > 10) throw apiError(400, '사진은 최대 10장까지 올릴 수 있어요.');
    if ((input.files?.length ?? 0) > 5) throw apiError(400, '파일은 최대 5개까지 첨부할 수 있어요.');

    const now = new Date();
    const photos = (input.photos ?? []).map((f) => ({
      url: URL.createObjectURL(f),
      // 실서버는 사진 EXIF에서 촬영 시각·GPS를 읽는다. 더미는 파일 수정 시각으로 대신한다
      takenAt: f.lastModified ? new Date(f.lastModified).toISOString() : null,
      latitude: null,
      longitude: null,
    }));
    const checks = [];
    if (photos.some((p) => p.takenAt && now - new Date(p.takenAt) > 86_400_000)) {
      checks.push({ type: 'old_photo', message: '하루 이상 지난 사진이 포함되어 있어요' });
    }
    if (!input.location) checks.push({ type: 'no_location', message: '제출 위치 정보가 없어요' });

    const owner = site.ownerId === user.id;
    const row = {
      id: `${site.id}-new${Date.now()}`,
      siteId: site.id,
      ...processFields,
      work,
      from: current,
      to,
      photoUris: photos.map((p) => p.url),
      photos,
      files: (input.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f), size: f.size })),
      memo: String(input.memo ?? '').trim(),
      workLog: input.workLog ?? { weather: null, workers: null, equipment: '' },
      author: user.name,
      authorId: user.id,
      createdAt: now.toISOString(),
      location: input.location ?? null,
      // 본사 없는 현장의 총관리자 보고는 바로 승인 (서버 규칙)
      review:
        owner && !site.companyId
          ? { status: 'approved', comment: null, reviewer: null, reviewedAt: null }
          : { status: 'pending', comment: null, reviewer: null, reviewedAt: null },
      checks,
    };
    db.reports.push(row);
    return clone(withPermissions(user, row));
  },

  // 작성자: 메모 수정 → 보완 요청 상태면 다시 검토 대기
  updateMemo: (reportId, memo) =>
    respond(() => {
      const user = currentUser();
      const row = db.reports.find((r) => r.id === reportId);
      if (!row) throw apiError(404, '보고를 찾을 수 없습니다.');
      if (row.authorId !== user.id) throw apiError(403, '작성자만 수정할 수 있습니다.');
      row.memo = String(memo ?? '').trim();
      row.updatedAt = new Date().toISOString();
      if (row.review.status === 'revision') row.review = { ...row.review, status: 'pending' };
      return withPermissions(user, row);
    }),

  // 실서버: POST /sites/{id}/worklog/link?from&to → { url }
  worklogLink: (siteId, from, to) =>
    respond(() => {
      const user = currentUser();
      const site = findVisibleSite(user, siteId);
      const { csv, count } = worklogCsv(site, from, to);
      if (count === 0) throw apiError(404, '선택한 기간에 보고가 없어요.');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      return { url, fileName: `${site.name}_작업일보_${from}_${to}.csv` };
    }),
};

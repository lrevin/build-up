// 서버 없이 동작하는 가짜 API. 실제 API와 같은 함수 모양·응답 형식·에러 형식을 지킨다.
// 권한 규칙은 app/dummy.ts(= 서버 ReportService.canReview 규칙)와 맞춘다.
import { createSeed, DEMO_PASSWORD } from './seed';
import { tokenStorage } from '../services/tokenStorage';

const db = createSeed();

const DELAY_MS = 250;
const delay = (ms = DELAY_MS) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

const apiError = (status, code, message) => ({ isNormalized: true, status, code, message });

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
  if (!user) throw apiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  return user;
}

// ───────── 권한 ─────────
const isHqOf = (user, site) => user.role === 'hq' && !!site.companyId && user.hqCompanyId === site.companyId;

function visibleSites(user) {
  if (user.role === 'system') return db.sites;
  if (user.role === 'hq') return db.sites.filter((s) => isHqOf(user, s));
  throw apiError(403, 'FORBIDDEN', '본사 관계자만 볼 수 있어요.');
}

function findVisibleSite(user, siteId) {
  const site = visibleSites(user).find((s) => s.id === siteId);
  if (!site) throw apiError(404, 'SITE_NOT_FOUND', '현장을 찾을 수 없습니다.');
  return site;
}

const siteById = (id) => db.sites.find((s) => s.id === id);
const userName = (id) => db.users.find((u) => u.id === id)?.name ?? '-';
const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
const reportsOf = (siteId) => db.reports.filter((r) => r.siteId === siteId).sort(byNewest);

function withPermissions(user, row) {
  const site = siteById(row.siteId);
  const canReview =
    row.review.status === 'pending' && row.authorId !== user.id && (site.ownerId === user.id || isHqOf(user, site));
  return { ...row, siteName: site.name, canEdit: false, canDelete: false, canReview };
}

function siteProgress(siteId) {
  return reportsOf(siteId)[0]?.to ?? 0;
}

function summary(user, s) {
  const reports = reportsOf(s.id);
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    ownerName: userName(s.ownerId),
    memberCount: s.memberIds.length,
    overallProgress: siteProgress(s.id),
    isOwner: s.ownerId === user.id,
    workType: s.workType,
    lastReportedAt: reports[0]?.createdAt ?? null,
    hqName: db.companies.find((c) => c.id === s.companyId)?.name ?? null,
    pendingMaterials: 0,
    pendingReviews: reports.filter((r) => withPermissions(user, r).canReview).length,
  };
}

// cursor = 다음 시작 인덱스 (실서버는 불투명 문자열로 취급)
function pageOf(list, cursor, size) {
  const start = cursor ? Number(cursor) : 0;
  const items = list.slice(start, start + size);
  const next = start + size < list.length ? String(start + size) : null;
  return { items, nextCursor: next, total: start === 0 ? list.length : null };
}

export const mockServer = {
  login: (email, password) =>
    respond(() => {
      const user = db.users.find((u) => u.email === String(email).trim().toLowerCase());
      if (!user || password !== DEMO_PASSWORD) {
        throw apiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      return {
        tokenType: 'Bearer',
        accessToken: `${TOKEN_PREFIX}${user.id}`,
        refreshToken: `dummy-refresh.${user.id}`,
        user: publicUser(user),
      };
    }),

  me: () => respond(() => publicUser(currentUser())),

  getHqInfo: () =>
    respond(() => {
      const user = currentUser();
      const company = db.companies.find((c) => c.id === user.hqCompanyId);
      return {
        name: company?.name ?? 'Build Up',
        code: company?.code ?? '',
        siteCount: visibleSites(user).length,
        staff: db.users.filter((u) => company && u.hqCompanyId === company.id).map((u) => u.name),
      };
    }),

  getHqSites: () =>
    respond(() => {
      const user = currentUser();
      return visibleSites(user).map((s) => summary(user, s));
    }),

  getHqReportPage: (cursor, size) =>
    respond(() => {
      const user = currentUser();
      const ids = new Set(visibleSites(user).map((s) => s.id));
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
      };
    }),

  getSiteReportPage: (siteId, cursor, size) =>
    respond(() => {
      const user = currentUser();
      findVisibleSite(user, siteId);
      const list = reportsOf(siteId).map((r) => withPermissions(user, r));
      return pageOf(list, cursor, size);
    }),

  reviewReport: (reportId, status, comment) =>
    respond(() => {
      const user = currentUser();
      const row = db.reports.find((r) => r.id === reportId);
      if (!row) throw apiError(404, 'REPORT_NOT_FOUND', '보고를 찾을 수 없습니다.');
      findVisibleSite(user, row.siteId);
      if (!['approved', 'revision'].includes(status)) {
        throw apiError(400, 'INVALID_STATUS', '알 수 없는 검토 상태입니다.');
      }
      const text = String(comment ?? '').trim();
      if (status === 'revision' && !text) {
        throw apiError(400, 'COMMENT_REQUIRED', '무엇을 보완해야 하는지 코멘트를 적어 주세요.');
      }
      if (text.length > 500) throw apiError(400, 'COMMENT_TOO_LONG', '코멘트는 500자까지 쓸 수 있어요.');
      if (!withPermissions(user, row).canReview) {
        throw apiError(
          409,
          'NOT_REVIEWABLE',
          row.review.status !== 'pending'
            ? '이미 검토한 보고예요. 목록을 새로고침해 주세요.'
            : '현장 총관리자나 본사 관계자만 검토할 수 있어요.',
        );
      }
      row.review = {
        status,
        comment: text || null,
        reviewer: user.name,
        reviewedAt: new Date().toISOString(),
      };
      return withPermissions(user, row);
    }),
};

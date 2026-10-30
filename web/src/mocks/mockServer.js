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
// 이메일 인증 코드 · 인증 완료 토큰 · 카카오 연결 (더미 내부 상태)
const auth = {
  codes: new Map(), // 'email:주소' | 'phone:숫자' → { code, sentAt, expiresAt, tries }
  verified: new Map(), // ev_ / pv_ 토큰 → { kind, target, expiresAt }
  kakaoSignups: new Map(), // signupToken → { kakaoId, email, name, expiresAt }
  kakaoAccounts: new Map(), // kakaoId → userId
};
const TOKEN_PREFIX = 'dummy-access.';

function publicUser(u) {
  const { hqCompanyId, password, ...rest } = u; // 더미 내부용 칸은 응답에서 뺀다
  void hqCompanyId;
  void password;
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

// 참여 코드로 현장 찾기 (서버 SiteService.preview / join)
function siteByCode(user, code) {
  if (user.role === 'hq' || user.role === 'system') {
    throw apiError(403, '본사 관계자는 현장 관리자가 본사 코드로 연결한 현장을 볼 수 있어요.');
  }
  if (!/^\d{6}$/.test(String(code))) throw apiError(400, '참여 코드는 6자리 숫자예요.');
  const site = db.sites.find((s) => s.code === String(code));
  if (!site) throw apiError(404, '해당 코드의 현장을 찾을 수 없습니다.');
  return site;
}
const userName = (id) => db.users.find((u) => u.id === id)?.name ?? '-';
const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
const reportsOf = (siteId) => db.reports.filter((r) => r.siteId === siteId).sort(byNewest);
const approvedReportsOf = (siteId) => reportsOf(siteId).filter((r) => r.review?.status === 'approved');

function withPermissions(user, row) {
  const site = siteById(row.siteId);
  const canReview =
    row.review.status === 'pending' && row.authorId !== user.id && (site.ownerId === user.id || canHqReview(user, site));
  return { ...row, siteName: site.name, canEdit: row.authorId === user.id, canDelete: false, canReview };
}

// 자동 계산 현장의 공정별 현재 진행률 = 그 공정의 가장 최근 보고 값
function processesOf(site) {
  if (site.progressMode !== 'auto') return [];
  const reports = approvedReportsOf(site.id);
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
  const approved = approvedReportsOf(s.id);
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    ownerName: userName(s.ownerId),
    memberCount: s.memberIds.length,
    overallProgress: approved[0]?.to ?? 0,
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
      // 시드 계정은 공통 비밀번호, 더미에서 새로 가입한 계정은 가입할 때 쓴 비밀번호
      // 카카오 전용 계정(password: null)은 비밀번호 로그인 불가 (서버: password_hash NULL)
      const expected = user && 'password' in user ? user.password : DEMO_PASSWORD;
      if (!user || expected == null || password !== expected) throw apiError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
      return tokenResponse(user);
    }),

  // 서버 AuthService.signUp 규칙 그대로 (검사 문구도 SignUpRequest 와 같음)
  signUp: (input) =>
    respond(() => {
      const role = input.role;
      if (!['admin', 'worker', 'hq'].includes(role)) throw apiError(400, '역할이 올바르지 않습니다.');
      // 카카오 가입: signupToken 으로 카카오 계정 확인 (비밀번호 없음, 카카오가 준 이메일은 인증된 것으로 봄)
      const kakao = input.signupToken ? auth.kakaoSignups.get(input.signupToken) : null;
      if (input.signupToken && (!kakao || kakao.expiresAt < Date.now())) {
        throw apiError(400, '카카오 가입 시간이 지났어요. 카카오 로그인을 다시 해 주세요.');
      }
      const name = String(input.name ?? '').trim();
      const email = String(kakao?.email ?? input.email ?? '').trim().toLowerCase();
      const phone = String(input.phone ?? '').trim();
      const company = String(input.company ?? '').trim();
      const code = String(input.companyCode ?? '').trim();
      if (!name) throw apiError(400, '이름을 입력해 주세요.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError(400, '이메일 형식이 올바르지 않아요.');
      if (!phone) throw apiError(400, '휴대폰 번호를 입력해 주세요.');
      if (!kakao && String(input.password ?? '').length < 8) throw apiError(400, '비밀번호는 8자 이상이어야 해요.');
      if (db.users.some((u) => u.email === email)) throw apiError(409, '이미 가입된 이메일입니다.');
      // 가입 인증 (서버 SignupVerification.check): 이메일(카카오가 준 이메일이면 생략) + 휴대폰 둘 다 필수.
      // 인증한 값과 가입 값이 달라도 실패
      const ok = (token, kind, target) => {
        const v = auth.verified.get(token);
        return !!v && v.kind === kind && v.target === target && v.expiresAt > Date.now();
      };
      if (!(kakao?.email && kakao.email === email) && !ok(input.emailVerificationToken, 'email', email)) {
        throw apiError(400, '이메일 인증을 완료해 주세요.');
      }
      if (!ok(input.phoneVerificationToken, 'phone', phone.replace(/\D/g, ''))) {
        throw apiError(400, '휴대폰 인증을 완료해 주세요.');
      }

      const findCompany = () => {
        const c = db.companies.find((x) => x.code === code);
        if (!c) throw apiError(404, '해당 코드의 본사를 찾을 수 없습니다.\n코드를 다시 확인해 주세요.');
        return c;
      };
      const user = {
        id: `u-${Date.now()}`, name, email, phone, role, password: input.password,
        company: null, companyCode: null, hqName: null, hqRole: null, canReviewReports: false,
      };
      if (role === 'admin') {
        const hq = code ? findCompany() : null; // 본사 코드가 있으면 그 본사에 보고, 없으면 최고 책임자
        user.hqName = hq?.name ?? null;
        user.company = hq?.name ?? null; // 현장 관리자 회사·사무소명은 DB(V11)에 칸이 없어 저장 안 됨
      }
      if (role === 'hq') {
        let hq;
        if (code) {
          hq = findCompany(); // 본사 코드로 합류 = 본사 직원
        } else {
          if (!company) throw apiError(400, '본사명을 입력해 주세요.');
          let newCode;
          do newCode = String(100000 + Math.floor(Math.random() * 900000));
          while (db.companies.some((c) => c.code === newCode));
          hq = { id: `c-${Date.now()}`, name: company, code: newCode };
          db.companies.push(hq); // 새 본사 등록 = 본사 관리자
        }
        Object.assign(user, {
          company: hq.name, companyCode: hq.code, hqCompanyId: hq.id,
          hqRole: code ? 'member' : 'manager', canReviewReports: !code,
        });
      }
      if (kakao) {
        user.password = null; // 카카오 전용 계정 → 비밀번호 로그인 불가
        auth.kakaoAccounts.set(kakao.kakaoId, user.id);
        auth.kakaoSignups.delete(input.signupToken);
      }
      auth.verified.delete(input.emailVerificationToken); // 한 번 가입에 쓴 토큰은 다시 못 씀
      auth.verified.delete(input.phoneVerificationToken);
      db.users.push(user);
      return tokenResponse(user);
    }),

  // 가입 인증 코드 (서버 SignupVerification · Verifications 와 같은 규칙·문구)
  // 실서버는 메일·문자로 보냄. 더미는 보낼 곳이 없으므로 응답에 코드를 같이 넣어 화면에 보여 준다
  sendCode: (kind, raw) =>
    respond(() => {
      const mail = kind === 'email' || kind === 'reset';
      const target = mail ? String(raw ?? '').trim().toLowerCase() : String(raw ?? '').replace(/\D/g, '');
      if (kind === 'reset') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw apiError(400, '이메일 형식이 올바르지 않아요.');
      } else if (kind === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw apiError(400, '이메일 형식이 올바르지 않아요.');
        if (db.users.some((u) => u.email === target)) throw apiError(409, '이미 가입된 이메일입니다.');
      } else if (!/^01[016789]\d{7,8}$/.test(target)) {
        throw apiError(400, '휴대폰 번호를 확인해 주세요.');
      }
      const key = `${kind}:${target}`;
      const prev = auth.codes.get(key);
      const wait = prev ? Math.ceil((prev.sentAt + 60_000 - Date.now()) / 1000) : 0;
      if (wait > 0) throw apiError(429, `${wait}초 뒤에 다시 받을 수 있어요.`);
      const code = String(100000 + Math.floor(Math.random() * 900000));
      auth.codes.set(key, { code, sentAt: Date.now(), expiresAt: Date.now() + 300_000, tries: 0 });
      return { expiresInSeconds: 300, resendAfterSeconds: 60, dummyCode: code };
    }),

  verifyCode: (kind, raw, input) =>
    respond(() => {
      const mail = kind === 'email' || kind === 'reset';
      const target = mail ? String(raw ?? '').trim().toLowerCase() : String(raw ?? '').replace(/\D/g, '');
      const row = auth.codes.get(`${kind}:${target}`);
      if (!row) throw apiError(400, '인증 코드를 먼저 받아 주세요.');
      if (row.tries >= 5) throw apiError(429, '인증 코드를 5번 틀렸어요. 코드를 다시 받아 주세요.');
      if (row.expiresAt < Date.now()) throw apiError(400, '인증 코드가 만료됐어요. 다시 받아 주세요.');
      if (String(input).trim() !== row.code) {
        row.tries += 1;
        if (row.tries >= 5) throw apiError(429, '인증 코드를 5번 틀렸어요. 코드를 다시 받아 주세요.');
        throw apiError(400, `인증 코드가 맞지 않아요. (${5 - row.tries}번 남음)`);
      }
      auth.codes.delete(`${kind}:${target}`); // 다시 받기 60초 대기는 서버와 달리 생략(더미)
      const prefix = { email: 'ev_', phone: 'pv_', reset: 'rv_' }[kind];
      const token = `${prefix}${Math.random().toString(36).slice(2)}`;
      auth.verified.set(token, { kind, target, expiresAt: Date.now() + 1_800_000 });
      if (kind === 'reset') return { resetToken: token, expiresInSeconds: 1800 };
      return kind === 'email'
        ? { emailVerificationToken: token, expiresInSeconds: 1800 }
        : { phoneVerificationToken: token, expiresInSeconds: 1800 };
    }),

  resetPassword: ({ email, resetToken, password }) =>
    respond(() => {
      const target = String(email ?? '').trim().toLowerCase();
      const v = auth.verified.get(resetToken);
      if (!v || v.kind !== 'reset' || v.target !== target) {
        throw apiError(400, '인증 시간이 지났어요. 이메일 인증을 다시 해 주세요.');
      }
      if (String(password ?? '').length < 8) throw apiError(400, '비밀번호는 8자 이상이어야 해요.');
      auth.verified.delete(resetToken);
      const user = db.users.find((u) => u.email === target);
      if (user) user.password = password;
      return { ok: true };
    }),

  withdraw: () =>
    respond(() => {
      throw apiError(400, '더미 데이터 모드에서는 탈퇴할 수 없어요.');
    }),

  // 카카오: 더미는 카카오 서버 대신 고정된 카카오 사용자 한 명으로 흉내 낸다
  kakaoLogin: (code) =>
    respond(() => {
      if (!String(code ?? '').startsWith('dummy-kakao')) throw apiError(400, '카카오 로그인에 실패했어요. 다시 시도해 주세요.');
      const kakao = { kakaoId: 'kakao-1001', email: 'kakao.user@kakao.com', name: '카카오사용자' };
      const userId = auth.kakaoAccounts.get(kakao.kakaoId);
      const user = db.users.find((u) => u.id === userId);
      if (user) return tokenResponse(user);
      if (db.users.some((u) => u.email === kakao.email)) {
        throw apiError(409, '이미 이메일로 가입된 계정이에요. 이메일로 로그인해 주세요.');
      }
      const signupToken = `st_${Math.random().toString(36).slice(2)}`;
      auth.kakaoSignups.set(signupToken, { ...kakao, expiresAt: Date.now() + 600_000 });
      return { signupRequired: true, signupToken, provider: 'kakao', email: kakao.email, name: kakao.name, expiresInSeconds: 600 };
    }),

  previewSite: (code) =>
    respond(() => {
      const user = currentUser();
      const site = siteByCode(user, code);
      return {
        id: site.id,
        name: site.name,
        address: site.address,
        ownerName: userName(site.ownerId),
        memberCount: site.memberIds.length,
        alreadyJoined: isMember(user, site),
      };
    }),

  joinSite: (code) =>
    respond(() => {
      const user = currentUser();
      const site = siteByCode(user, code);
      if (!isMember(user, site)) site.memberIds.push(user.id);
      return summary(user, site);
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

  createSite: (input) =>
    respond(() => {
      const user = currentUser();
      if (user.role !== 'admin') throw apiError(403, '현장 관리자만 현장을 만들 수 있어요.');
      const site = {
        id: `site-${Date.now()}`,
        name: String(input.name ?? '').trim(),
        address: String(input.address ?? '').trim(),
        workType: String(input.workType ?? '').trim(),
        ownerId: user.id,
        memberIds: [user.id],
        companyId: null,
        code: String(100000 + Math.floor(Math.random() * 900000)),
        latitude: null,
        longitude: null,
        progressMode: input.progressMode ?? 'manual',
        processes: (input.processes ?? []).map((process, index) => ({
          key: process.key || `process-${Date.now()}-${index + 1}`,
          name: process.name,
          weight: Number(process.weight),
          start: 0,
        })),
        materials: (input.materials ?? []).map((m) => ({ ...m, updatedAt: new Date().toISOString() })),
      };
      if (!site.name || !site.address) throw apiError(400, '현장명과 주소를 입력해 주세요.');
      db.sites.push(site);
      return {
        ...summary(user, site),
        ownerId: user.id,
        code: site.code,
        materials: site.materials,
        processes: processesOf(site),
      };
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
        code: s.ownerId === user.id ? s.code : null, // 참여 코드는 현장 총관리자에게만 (서버 SiteService 와 같음)
        memberCount: sum.memberCount,
        overallProgress: sum.overallProgress,
        workType: s.workType,
        lastReportedAt: sum.lastReportedAt,
        hqName: sum.hqName,
        latitude: s.latitude,
        longitude: s.longitude,
        progressMode: s.progressMode,
        processes: processesOf(s),
        materials: s.materials ?? [],
      };
    }),

  setSiteMaterials: (siteId, materials) =>
    respond(() => {
      const user = currentUser();
      const site = findMemberSite(user, siteId);
      if (site.ownerId !== user.id) throw apiError(403, '현장 최고 책임자만 자재 재고를 수정할 수 있어요.');
      site.materials = (materials ?? []).map((m) => ({ ...m, updatedAt: new Date().toISOString() }));
      return {
        ...summary(user, site),
        ownerId: site.ownerId,
        ownerName: userName(site.ownerId),
        code: site.code,
        materials: site.materials,
        processes: processesOf(site),
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
      const site = findVisibleSite(user, row.siteId);
      if (!['approved', 'revision'].includes(status)) throw apiError(400, '알 수 없는 검토 상태입니다.');
      const text = String(comment ?? '').trim();
      if (status === 'revision' && !text) throw apiError(400, '무엇을 보완해야 하는지 코멘트를 적어 주세요.');
      if (text.length > 500) throw apiError(400, '코멘트는 500자까지 쓸 수 있어요.');
      if (!withPermissions(user, row).canReview) {
        throw apiError(
          row.review.status !== 'pending' ? 409 : 403,
          row.review.status !== 'pending'
            ? '이미 검토한 보고예요. 목록을 새로고침해 주세요.'
            : '현장 관리자나 본사 관리자만 검토할 수 있어요.',
        );
      }
      row.review = { status, comment: text || null, reviewer: user.name, reviewedAt: new Date().toISOString() };
      if (status === 'approved' && !row.materialsAppliedAt && row.materialUsages?.length) {
        for (const usage of row.materialUsages) {
          const stock = (site.materials ?? []).find(
            (item) => item.name.trim().toLowerCase() === usage.name.trim().toLowerCase() && item.unit.trim().toLowerCase() === usage.unit.trim().toLowerCase(),
          );
          if (stock) stock.quantity = Math.max(0, Number(stock.quantity) - Number(usage.quantity));
        }
        row.materialsAppliedAt = new Date().toISOString();
      }
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

  createMaterialRequest: (siteId, input) =>
    respond(() => {
      const user = currentUser();
      const site = findMemberSite(user, siteId);
      const items = (input.items ?? []).map((item) => ({
        name: String(item.name ?? '').trim(),
        quantity: Number(item.quantity),
        unit: String(item.unit ?? '').trim(),
      }));
      if (!items.length || items.some((item) => !item.name || !item.unit || !(item.quantity > 0))) {
        throw apiError(400, '자재명·수량·단위를 모두 입력해 주세요.');
      }
      const now = new Date().toISOString();
      const ownerRequest = site.ownerId === user.id;
      const linked = !!site.companyId;
      const status = ownerRequest && !linked ? 'approved' : 'requested';
      const request = {
        id: `m-${Date.now()}`,
        siteId: site.id,
        processKey: input.processKey ?? null,
        processName: null,
        items,
        neededBy: input.neededBy || null,
        urgent: !!input.urgent,
        note: String(input.note ?? '').trim(),
        status,
        rejectReason: null,
        author: user.name,
        authorId: user.id,
        createdAt: now,
        timeline: [
          { status: 'requested', by: user.name, byHq: false, at: now },
          ...(status === 'approved' ? [{ status: 'approved', by: user.name, byHq: false, at: now }] : []),
        ],
      };
      db.materials.unshift(request);
      return withMaterialPermissions(user, request);
    }),

  // 실서버: POST /sites/{id}/reports (multipart). 더미는 사진을 브라우저 안 주소(blob:)로만 보관한다
  createReport: async (siteId, input) => {
    await delay(600);
    const user = currentUser();
    const site = findMemberSite(user, siteId);
    let work = String(input.work ?? '').trim();
    if (work.length > 100) throw apiError(400, '진행한 작업은 100자까지 쓸 수 있어요.');
    const current = approvedReportsOf(site.id)[0]?.to ?? 0;
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
    const photos = (input.photos ?? []).map((f, index) => ({
      url: URL.createObjectURL(f),
      // 실서버는 사진 EXIF에서 촬영 시각·GPS를 읽는다. 더미는 파일 수정 시각으로 대신한다
      takenAt: f.lastModified ? new Date(f.lastModified).toISOString() : null,
      latitude: null,
      longitude: null,
      phase: input.photoPhases?.[index] ?? 'after',
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
      rating: owner ? input.rating ?? null : null,
      materialUsages: input.materials ?? [],
      materialsAppliedAt: null,
    };
    if (row.review.status === 'approved' && row.materialUsages.length) {
      for (const usage of row.materialUsages) {
        const stock = (site.materials ?? []).find(
          (item) => item.name.trim().toLowerCase() === usage.name.trim().toLowerCase() && item.unit.trim().toLowerCase() === usage.unit.trim().toLowerCase(),
        );
        if (stock) stock.quantity = Math.max(0, Number(stock.quantity) - Number(usage.quantity));
      }
      row.materialsAppliedAt = now.toISOString();
    }
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
  // 데모(가짜 API) 모드에서 아직 흉내 내지 않는 기능(현장 설정·참여자 관리 등)
  unsupported: () =>
    respond(() => {
      throw apiError(400, '데모 모드에서는 지원하지 않는 기능이에요. 실제 서버에 연결해 주세요.');
    }),

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

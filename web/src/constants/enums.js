// 기준: docs/API_약속.md (앱·웹·서버 공통) + app/types.ts
// API(JSON) 값은 항상 소문자. 값이 바뀌면 API 약속 문서와 이 파일을 함께 고친다.

// 계정 종류 (/api/auth/me 의 role)
export const USER_ROLE = Object.freeze({
  WORKER: 'worker', // 작업자
  ADMIN: 'admin', // 현장 관리자
  HQ: 'hq', // 본사 관계자
  SYSTEM: 'system', // 시스템 관리자
});

export const USER_ROLE_LABEL = Object.freeze({
  worker: '작업자',
  admin: '현장 관리자',
  hq: '본사 관계자',
  system: '시스템 관리자',
});

// 본사 안에서의 역할 (role === 'hq' 일 때만)
export const HQ_ROLE_LABEL = Object.freeze({
  manager: '본사 관리자',
  member: '본사 직원',
});

// 모든 계정이 웹에 로그인하고, 계정 종류에 따라 다른 페이지로 간다
//   본사 관계자 → 관리자 페이지 /admin
//   현장 관리자 · 작업자 → 사용자 페이지 /my
//   시스템 관리자 → /system (서버 /api/system/* 전용, 웹 화면은 아직 안내만)
export const ADMIN_ROLES = [USER_ROLE.HQ];
export const USER_ROLES = [USER_ROLE.ADMIN, USER_ROLE.WORKER];

export function homePathFor(role) {
  if (ADMIN_ROLES.includes(role)) return '/admin';
  if (role === USER_ROLE.SYSTEM) return '/system';
  return '/my';
}

// 보고 작성 제한 (서버 ReportService 와 동일)
export const REPORT_LIMITS = Object.freeze({ WORK_MAX: 100, PHOTOS_MAX: 10, FILES_MAX: 5 });
// 첨부 가능한 문서 (서버 FileStorage.checkDocument)
export const REPORT_DOC_ACCEPT = '.pdf,.xls,.xlsx,.csv,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.txt,.zip';
// 사진 형식 (서버 FileStorage.PHOTO_TYPES)
export const REPORT_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic';

// 보고 검토 상태 (API 약속 1번 / DB: PENDING·APPROVED·REVISION)
export const REVIEW_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REVISION: 'revision', // 보완 요청 (코멘트 필수)
});

export const REVIEW_STATUS_LABEL = Object.freeze({
  pending: '검토 대기',
  approved: '승인',
  revision: '보완 요청',
});

// 진행률 계산 방식 (API 약속 5번)
export const PROGRESS_MODE = Object.freeze({
  MANUAL: 'manual', // 보고자가 현장 전체 진행률 직접 입력
  AUTO: 'auto', // 공정 가중치로 자동 계산
});

export const PROGRESS_MODE_LABEL = Object.freeze({
  manual: '직접 입력',
  auto: '공정 가중치 자동 계산',
});

// 보고 자동 검사 결과 (report_checks.check_type)
export const REPORT_CHECK_LABEL = Object.freeze({
  old_photo: '오래된 사진',
  far_submit: '현장 밖에서 제출',
  far_photo: '사진 위치가 현장과 다름',
  no_location: '위치 정보 없음',
});

// 자재 요청 상태 (보고 검토와 별개, API 약속 1번)
export const MATERIAL_STATUS = Object.freeze({
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const MATERIAL_STATUS_LABEL = Object.freeze({
  requested: '요청',
  approved: '승인',
  rejected: '반려',
});

// 반려 사유 빠른 선택 (앱 app/Material.tsx 와 동일)
export const MATERIAL_REJECT_REASONS = [
  '재고가 부족해요',
  '수량을 다시 확인해 주세요',
  '이미 요청된 자재예요',
  '이번 주에는 반입이 어려워요',
];

export const WEATHER_LABEL = Object.freeze({
  sunny: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈',
});

// 서버 검증 규칙과 맞춘 값
export const REVIEW_COMMENT_MAX = 500;

// 마지막 보고 후 이 일수가 지나면 '보고 지연'으로 표시
export const STALE_REPORT_DAYS = 3;

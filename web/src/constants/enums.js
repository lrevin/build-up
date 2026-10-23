// 기준: 레포의 공용 데이터 계약 app/types.ts (main 8c85b37)
// ⚠️ 백엔드 엔티티 enum과 대소문자·이름이 다르다. 팀 합의가 나면 이 파일만 수정한다.

// 계정 종류 (/auth/me 응답의 User.role)
// 백엔드 엔티티: users.role = 'USER' | 'SYSTEM_ADMIN', 본사 여부는 company_memberships
export const USER_ROLE = Object.freeze({
  ADMIN: 'admin', // 현장 관리자
  WORKER: 'worker', // 작업자
  HQ: 'hq', // 본사 관계자
  SYSTEM: 'system', // 시스템 관리자
});

export const USER_ROLE_LABEL = Object.freeze({
  admin: '현장 관리자',
  worker: '작업자',
  hq: '본사 관계자',
  system: '시스템 관리자',
});

// 웹 대시보드 접근 허용 (현장 관리자·작업자는 모바일 앱 전용)
export const WEB_ALLOWED_ROLES = [USER_ROLE.HQ, USER_ROLE.SYSTEM];

// 보고 검토 상태 (백엔드 엔티티 ReportReviewStatus: PENDING | APPROVED | REJECTED)
export const REVIEW_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REVISION: 'revision', // 보완 요청 (엔티티의 REJECTED)
});

export const REVIEW_STATUS_LABEL = Object.freeze({
  pending: '검토 대기',
  approved: '승인',
  revision: '보완 요청',
});

// 보고 자동 검사 결과 (report_checks.check_type)
export const REPORT_CHECK_LABEL = Object.freeze({
  old_photo: '오래된 사진',
  far_submit: '현장 밖에서 제출',
  far_photo: '사진 위치가 현장과 다름',
  no_location: '위치 정보 없음',
});

export const WEATHER_LABEL = Object.freeze({
  sunny: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈',
});

// 서버 검증 규칙과 맞춘 값 (app/dummy.ts reviewReport와 동일)
export const REVIEW_COMMENT_MAX = 500;

// 마지막 보고 후 이 일수가 지나면 '보고 지연'으로 표시
export const STALE_REPORT_DAYS = 3;

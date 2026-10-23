// 더미 모드 스위치. .env.local 에서 VITE_USE_DUMMY=false 로 바꾸면 실제 서버로 요청한다.
// 서버 계약(상태값·로그인 응답)이 확정되기 전까지는 기본값 true.
export const USE_DUMMY = (import.meta.env.VITE_USE_DUMMY ?? 'true') !== 'false';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 더미 모드 스위치. .env.local 에서 VITE_USE_DUMMY=false 로 바꾸면 실제 서버로 요청한다.
// 서버 계약(상태값·로그인 응답)이 확정되기 전까지는 기본값 true.
export const USE_DUMMY = (import.meta.env.VITE_USE_DUMMY ?? 'true') !== 'false';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 카카오 로그인: 카카오 개발자 앱의 REST API 키 (공개 값. Client Secret 은 서버에만)
// 실서버에서는 키를 넣어야 카카오 버튼이 보인다. 더미 모드는 키 없이 가짜 카카오 계정으로 동작.
export const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY || '';
export const KAKAO_LOGIN = USE_DUMMY || !!KAKAO_REST_API_KEY;

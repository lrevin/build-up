import { KAKAO_REST_API_KEY, USE_DUMMY } from '../config';

// 카카오 로그인 (인가 코드 방식). 카카오 로그인 화면 → /oauth/kakao/callback?code=&state= 으로 돌아온다.
// state: 다른 사이트가 콜백 주소로 코드를 밀어 넣는 것(CSRF)을 막는 1회용 값

const STATE_KEY = 'buildup.kakaoState';
export const KAKAO_CALLBACK_PATH = '/oauth/kakao/callback';

export const kakaoRedirectUri = () => `${window.location.origin}${KAKAO_CALLBACK_PATH}`;

function saveState(state) {
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* 저장소를 못 쓰는 브라우저: 확인을 건너뛴다 */
  }
}

// 콜백에서 한 번만 꺼내 쓰고 지운다
export function takeKakaoState() {
  try {
    const v = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return v;
  } catch {
    return null;
  }
}

export function startKakaoLogin(navigate) {
  const state = crypto.getRandomValues(new Uint32Array(2)).join('');
  saveState(state);
  if (USE_DUMMY) {
    // 더미: 카카오 화면 없이 바로 콜백으로 (가짜 인가 코드)
    navigate(`${KAKAO_CALLBACK_PATH}?code=dummy-kakao-${Date.now()}&state=${state}`);
    return;
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: kakaoRedirectUri(),
    state,
  });
  window.location.assign(`https://kauth.kakao.com/oauth/authorize?${params}`);
}

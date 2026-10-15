// JWT 저장소 단일 진입점. localStorage 직접 접근은 이 파일에서만 한다.
const ACCESS_KEY = 'buildup.accessToken';
const REFRESH_KEY = 'buildup.refreshToken';

const safeGet = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* 저장 불가 환경(프라이빗 모드 등)은 무시 */
  }
};

export const tokenStorage = {
  getAccessToken: () => safeGet(ACCESS_KEY),
  getRefreshToken: () => safeGet(REFRESH_KEY),
  setTokens: ({ accessToken, refreshToken }) => {
    safeSet(ACCESS_KEY, accessToken);
    if (refreshToken !== undefined) safeSet(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
  },
};

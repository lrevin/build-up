import axios from 'axios';
import { API_BASE_URL } from '../config';
import { tokenStorage } from '../services/tokenStorage';
import { ENDPOINTS, USE_REFRESH_TOKEN } from './endpoints';

export const AUTH_LOGOUT_EVENT = 'auth:logout';

// Content-Type 은 기본값을 두지 않는다: 일반 객체는 axios가 JSON으로, FormData(보고 사진)는 브라우저가
// multipart boundary 와 함께 정한다. 기본값을 application/json 으로 두면 axios가 FormData를 JSON으로 바꿔 사진이 빠진다.
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

// refresh 전용 (인터셉터 재귀 방지)
const bare = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });

// ───────── Request: Authorization 헤더 주입 ─────────
http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ───────── Response: 401 → refresh 1회 (동시 401은 refresh 하나를 공유) ─────────
let refreshPromise = null;

const forceLogout = () => {
  tokenStorage.clear();
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT)); // AuthContext가 받아서 /login 이동
};

const refreshAccessToken = async () => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
  // API 약속 3번: 요청 { refreshToken }, 응답은 로그인과 같은 모양 (refreshToken 은 그대로)
  const { data } = await bare.post(ENDPOINTS.AUTH.REFRESH, { refreshToken });
  tokenStorage.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? refreshToken });
  return data.accessToken;
};

const NO_REFRESH_URLS = [ENDPOINTS.AUTH.LOGIN, ENDPOINTS.AUTH.REFRESH, ENDPOINTS.AUTH.LOGOUT];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.skipAuth ||
      NO_REFRESH_URLS.includes(original.url)
    ) {
      return Promise.reject(normalizeError(error));
    }

    if (!USE_REFRESH_TOKEN) {
      forceLogout();
      return Promise.reject(normalizeError(error));
    }

    original._retry = true;
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    } catch {
      forceLogout();
      return Promise.reject(normalizeError(error));
    }
  },
);

// ───────── 에러 정규화: 화면은 { status, code, message } 하나만 다룬다 ─────────
// 백엔드 AuthException(HttpStatus, code, message) 형식 기준
export function normalizeError(error) {
  if (error?.isNormalized) return error;
  const res = error?.response;
  const body = res?.data;
  return {
    isNormalized: true,
    status: res?.status ?? 0, // 0 = 네트워크/타임아웃
    code: body?.code ?? (error?.code === 'ECONNABORTED' ? 'TIMEOUT' : 'UNKNOWN'),
    message:
      body?.message ??
      (res ? `요청 처리 중 오류가 발생했습니다. (${res.status})` : '서버에 연결할 수 없습니다.'),
  };
}

export default http;

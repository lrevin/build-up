import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

// 로그인 응답 (API 약속 3번 / 서버 LoginResponse):
//   { user, accessToken, refreshToken, tokenType, accessTokenExpiresAt, refreshTokenExpiresAt }
const toSession = (data) => ({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  user: data.user ?? null, // 없으면 /auth/me 로 조회
});

export const authApi = {
  login: ({ email, password }) =>
    USE_DUMMY
      ? mockServer.login(email, password).then(toSession)
      : http
          .post(ENDPOINTS.AUTH.LOGIN, { email, password }, { skipAuth: true })
          .then((r) => toSession(r.data)),

  me: () => (USE_DUMMY ? mockServer.me() : http.get(ENDPOINTS.AUTH.ME).then((r) => r.data)),

  // 실패해도 화면 로그아웃은 진행한다
  logout: (refreshToken) =>
    USE_DUMMY
      ? Promise.resolve()
      : http.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken }, { skipAuth: true }).catch(() => {}),
};

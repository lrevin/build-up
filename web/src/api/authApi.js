import http from './axiosInstance';
import { ENDPOINTS } from './endpoints';
import { USE_DUMMY } from '../config';
import { mockServer } from '../mocks/mockServer';

// ⚠️ 로그인 응답 형식이 레포 안에서 두 가지로 갈린다 (팀 확인 중):
//   - 백엔드 AuthService → TokenResponse(accessToken, refreshToken, 만료시각)
//   - 모바일 api/buildup.ts → { user, token }
// 확정 전까지 이 함수에서 둘 다 받아들인다. 확정되면 한쪽만 남긴다.
const toSession = (data) => ({
  accessToken: data.accessToken ?? data.token,
  refreshToken: data.refreshToken ?? null,
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

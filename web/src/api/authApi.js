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

  // 회원가입 (서버 AuthDtos.SignUpRequest). 성공하면 로그인과 같은 응답 → 바로 로그인 상태
  signUp: (input) =>
    USE_DUMMY
      ? mockServer.signUp(input).then(toSession)
      : http.post(ENDPOINTS.AUTH.SIGNUP, input, { skipAuth: true }).then((r) => toSession(r.data)),

  // 가입 인증 코드 보내기 / 확인 (가입 전, 로그인 없이). 확인 성공 → 30분짜리 인증 토큰
  sendEmailCode: (email) =>
    USE_DUMMY
      ? mockServer.sendCode('email', email)
      : http.post(ENDPOINTS.AUTH.EMAIL_SEND, { email }, { skipAuth: true }).then((r) => r.data),

  verifyEmailCode: (email, code) =>
    USE_DUMMY
      ? mockServer.verifyCode('email', email, code)
      : http.post(ENDPOINTS.AUTH.EMAIL_VERIFY, { email, code }, { skipAuth: true }).then((r) => r.data),

  sendPhoneCode: (phone) =>
    USE_DUMMY
      ? mockServer.sendCode('phone', phone)
      : http.post(ENDPOINTS.AUTH.PHONE_SEND, { phone }, { skipAuth: true }).then((r) => r.data),

  verifyPhoneCode: (phone, code) =>
    USE_DUMMY
      ? mockServer.verifyCode('phone', phone, code)
      : http.post(ENDPOINTS.AUTH.PHONE_VERIFY, { phone, code }, { skipAuth: true }).then((r) => r.data),

  // 카카오 인가 코드 → 가입된 사람: 세션 { accessToken, refreshToken, user }
  //                    처음 온 사람: { signupRequired: true, signupToken, email, name } 그대로
  kakaoLogin: ({ code, redirectUri }) =>
    (USE_DUMMY
      ? mockServer.kakaoLogin(code, redirectUri)
      : http.post(ENDPOINTS.AUTH.OAUTH_KAKAO, { code, redirectUri }, { skipAuth: true }).then((r) => r.data)
    ).then((data) => (data.signupRequired ? data : toSession(data))),

  me: () => (USE_DUMMY ? mockServer.me() : http.get(ENDPOINTS.AUTH.ME).then((r) => r.data)),

  // 비밀번호 찾기: 코드 보내기 → 확인(resetToken) → 새 비밀번호. 바꾸면 다른 기기 로그인은 끊긴다
  sendPasswordCode: (email) =>
    USE_DUMMY
      ? mockServer.sendCode('reset', email)
      : http.post(ENDPOINTS.AUTH.PASSWORD_SEND, { email }, { skipAuth: true }).then((r) => r.data),

  verifyPasswordCode: (email, code) =>
    USE_DUMMY
      ? mockServer.verifyCode('reset', email, code)
      : http.post(ENDPOINTS.AUTH.PASSWORD_VERIFY, { email, code }, { skipAuth: true }).then((r) => r.data),

  resetPassword: ({ email, resetToken, password }) =>
    USE_DUMMY
      ? mockServer.resetPassword({ email, resetToken, password })
      : http.post(ENDPOINTS.AUTH.PASSWORD_RESET, { email, resetToken, password }, { skipAuth: true }).then((r) => r.data),

  // 회원 탈퇴: 바로 로그아웃, 7일 뒤 계정 정보 영구 삭제 → { ok, deleteAt }
  withdraw: () => (USE_DUMMY ? mockServer.withdraw() : http.delete(ENDPOINTS.AUTH.ME).then((r) => r.data)),

  // 실패해도 화면 로그아웃은 진행한다
  logout: (refreshToken) =>
    USE_DUMMY
      ? Promise.resolve()
      : http.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken }, { skipAuth: true }).catch(() => {}),
};

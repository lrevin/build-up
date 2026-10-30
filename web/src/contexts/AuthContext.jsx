import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { AUTH_LOGOUT_EVENT } from '../api/axiosInstance';
import { tokenStorage } from '../services/tokenStorage';

// 모든 계정이 로그인할 수 있고, 어느 페이지로 갈지는 /auth/me 의 role 로 정한다 (constants/enums homePathFor).
// 화면 판단은 토큰이 아니라 /auth/me 응답으로 한다 (API 약속 2번).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    // 진행 중 요청을 먼저 취소: 토큰 없이 끝난 요청이 401 오류를 캐시에 남기지 않게
    queryClient.cancelQueries();
    queryClient.clear(); // 다른 계정 데이터가 캐시에 남지 않게
    setUser(null);
  }, [queryClient]);

  const logout = useCallback(() => {
    authApi.logout(tokenStorage.getRefreshToken());
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  // refresh 실패 시 인터셉터가 보내는 이벤트
  useEffect(() => {
    const onForced = () => {
      clearSession();
      navigate('/login', { replace: true });
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForced);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForced);
  }, [clearSession, navigate]);

  // 새로고침 시 저장된 토큰으로 세션 복구
  useEffect(() => {
    if (!tokenStorage.getAccessToken()) {
      setRestoring(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setRestoring(false));
  }, [clearSession]);

  // 로그인·가입 응답은 같은 모양 → 토큰 저장 후 user 확정
  const startSession = useCallback(async (session) => {
    tokenStorage.setTokens(session);
    const me = session.user ?? (await authApi.me());
    setUser(me);
    return me;
  }, []);

  const login = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  );

  // 가입에 성공하면 바로 로그인 상태가 된다 (앱과 같음)
  const signUp = useCallback(async (input) => startSession(await authApi.signUp(input)), [startSession]);

  // 카카오: 이미 가입한 사람은 로그인 → { user }, 처음 온 사람은 → { signup: { signupToken, email, name } }
  const loginWithKakao = useCallback(
    async (params) => {
      const result = await authApi.kakaoLogin(params);
      if (result.signupRequired) return { signup: result };
      return { user: await startSession(result) };
    },
    [startSession],
  );

  // 역할이 바뀐 뒤(현장 관리자 전환 등) 서버의 최신 내 정보로 바꾼다
  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, restoring, login, signUp, loginWithKakao, logout, refreshUser }),
    [user, restoring, login, signUp, loginWithKakao, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

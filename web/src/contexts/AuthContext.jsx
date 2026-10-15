import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { AUTH_LOGOUT_EVENT } from '../api/axiosInstance';
import { tokenStorage } from '../services/tokenStorage';
import { WEB_ALLOWED_ROLES } from '../constants/enums';

// JWT의 role claim은 users.role('USER'|'SYSTEM_ADMIN')이라 본사 여부를 알 수 없다.
// 그래서 권한은 토큰이 아니라 /auth/me 응답(User.role)으로 판단한다.
const AuthContext = createContext(null);

const forbiddenRoleError = {
  isNormalized: true,
  status: 403,
  code: 'FORBIDDEN_ROLE',
  message: '본사 관계자 계정만 웹 대시보드에 접속할 수 있어요. 현장 관리자는 모바일 앱을 이용해 주세요.',
};

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
      .then((me) => (WEB_ALLOWED_ROLES.includes(me.role) ? setUser(me) : clearSession()))
      .catch(() => clearSession())
      .finally(() => setRestoring(false));
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials);
      tokenStorage.setTokens(session);
      const me = session.user ?? (await authApi.me());
      if (!WEB_ALLOWED_ROLES.includes(me.role)) {
        authApi.logout(session.refreshToken);
        clearSession();
        throw forbiddenRoleError; // UX 차단일 뿐, 서버 권한 검사는 별도로 필수
      }
      setUser(me);
    },
    [clearSession],
  );

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, restoring, login, logout }),
    [user, restoring, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

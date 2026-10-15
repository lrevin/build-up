import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingBlock } from '../components/common/StateViews';

// 로그인한 본사 계정만 통과. 역할 검사는 AuthContext에서 로그인 시점에 이미 끝남.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <LoadingBlock label="로그인 정보 확인 중…" className="h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

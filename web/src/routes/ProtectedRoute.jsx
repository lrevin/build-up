import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingBlock } from '../components/common/StateViews';
import { homePathFor } from '../constants/enums';

// 로그인 + 계정 종류 확인. roles 를 주면 그 계정만 통과하고, 아니면 자기 첫 화면으로 보낸다.
// (화면 차단은 편의용이고, 실제 권한 검사는 서버가 한다)
export default function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <LoadingBlock label="로그인 정보 확인 중…" className="h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

// '/' 로 들어오면 계정 종류에 맞는 첫 화면으로
export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathFor(user?.role)} replace />;
}

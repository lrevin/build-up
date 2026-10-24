import { useAuth } from '../contexts/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

// 시스템 관리자: 서버에는 /api/system/* (통계·계정 관리)가 있지만 웹 화면은 아직 없다
export default function SystemPage() {
  const { user, logout } = useAuth();
  useDocumentTitle('시스템 관리자');
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center">
        <p className="text-[18px] font-bold text-gray-900">시스템 관리자 화면은 준비 중이에요</p>
        <p className="mt-2 text-[13px] text-gray-600">
          {user?.name}님은 시스템 관리자 계정이에요. 현장·보고 화면은 본사 관계자나 현장 계정으로 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-5 rounded-lg bg-ink-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-ink-800"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

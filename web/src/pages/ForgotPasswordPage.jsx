import { Link, useNavigate } from 'react-router-dom';
import { PasswordCard } from './AccountPage';
import useDocumentTitle from '../hooks/useDocumentTitle';

// 로그인 화면 "비밀번호를 잊으셨나요?": 로그인 없이 이메일 인증 → 새 비밀번호 → 로그인 화면으로
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  useDocumentTitle('비밀번호 찾기');

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[34px] font-black tracking-tight text-white">
            Build<span className="text-brand">Up</span>
          </p>
          <p className="mt-1 text-sm text-ink-400">공사 현장 보고 · 관리</p>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-xl">
          <PasswordCard onDone={() => navigate('/login', { replace: true })} />
        </div>
        <p className="mt-4 text-center text-[13px]">
          <Link to="/login" className="font-semibold text-white hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}

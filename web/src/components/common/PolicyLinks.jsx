import { Link } from 'react-router-dom';
import { POLICY_OPERATOR } from '../../constants/policies';

// 로그인·가입 화면 아래: 이용약관 · 개인정보 처리방침 · 운영 주체
export default function PolicyLinks() {
  return (
    <div className="mt-6 text-center text-[12px] text-ink-400">
      <p className="space-x-2">
        <Link to="/terms" className="hover:text-white hover:underline">
          이용약관
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="font-bold hover:text-white hover:underline">
          개인정보 처리방침
        </Link>
      </p>
      <p className="mt-1">{POLICY_OPERATOR} · 비영리 학생 프로젝트 · 무료 서비스</p>
    </div>
  );
}

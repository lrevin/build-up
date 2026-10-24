import { useNavigate } from 'react-router-dom';
import { startKakaoLogin } from '../../services/kakao';

// 카카오 로그인 버튼 (카카오 디자인 가이드: #FEE500 배경, 검은 말풍선 심볼)
export default function KakaoButton({ label = '카카오로 시작하기' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => startKakaoLogin(navigate)}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-2.5 text-sm font-semibold text-black/85 hover:brightness-95"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#000"
          d="M12 3C6.48 3 2 6.46 2 10.73c0 2.76 1.87 5.18 4.69 6.55-.15.53-.98 3.43-1.01 3.65 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.66-2.4 4.24-2.81.57.08 1.15.12 1.75.12 5.52 0 10-3.46 10-7.76S17.52 3 12 3z"
        />
      </svg>
      {label}
    </button>
  );
}

// "또는" 구분선
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-gray-400">
      <span className="h-px flex-1 bg-line" />
      또는
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

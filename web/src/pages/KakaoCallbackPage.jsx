import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/common/StateViews';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { homePathFor } from '../constants/enums';
import { kakaoRedirectUri, takeKakaoState } from '../services/kakao';

// 카카오 로그인 화면에서 돌아오는 곳: ?code=&state= (취소하면 ?error=access_denied)
export default function KakaoCallbackPage() {
  const [params] = useSearchParams();
  const { loginWithKakao } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const started = useRef(false); // 인가 코드는 한 번만 쓸 수 있다 (개발 모드 이중 실행 방지)
  useDocumentTitle('카카오 로그인');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const saved = takeKakaoState();
    if (params.get('error')) {
      setError('카카오 로그인을 취소했어요.');
      return;
    }
    // 이 브라우저에서 시작한 로그인이 아니면(state 없음·불일치) 거절 → 남이 만든 링크로 로그인되는 것 방지
    if (!code || !saved || state !== saved) {
      setError('잘못된 로그인 요청이에요. 처음부터 다시 시도해 주세요.');
      return;
    }
    loginWithKakao({ code, redirectUri: kakaoRedirectUri() })
      .then((r) => {
        if (r.signup) navigate('/signup', { replace: true, state: { kakao: r.signup } });
        else navigate(homePathFor(r.user.role), { replace: true });
      })
      .catch((err) => setError(err?.message ?? '카카오 로그인에 실패했어요.'));
  }, [params, loginWithKakao, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        {error ? (
          <>
            <p className="text-[16px] font-bold text-gray-900">카카오 로그인에 실패했어요</p>
            <p role="alert" className="mt-2 whitespace-pre-line text-[13px] text-gray-600">
              {error}
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-lg bg-ink-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-ink-800"
            >
              로그인 화면으로
            </Link>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-[14px] text-gray-600">
            <Spinner /> 카카오 계정 확인 중…
          </p>
        )}
      </div>
    </div>
  );
}

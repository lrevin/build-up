import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { USE_DUMMY } from '../config';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../mocks/seed';

export default function LoginPage() {
  const { login, isAuthenticated, restoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(USE_DUMMY ? DEMO_ACCOUNTS[0].email : '');
  const [password, setPassword] = useState(USE_DUMMY ? DEMO_PASSWORD : '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!restoring && isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err?.message ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[34px] font-black tracking-tight text-white">
            Build<span className="text-brand">Up</span>
          </p>
          <p className="mt-1 text-sm text-ink-400">본사 관리자 대시보드</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[12px] text-bad">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-60"
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        {USE_DUMMY && (
          <div className="mt-4 rounded-xl border border-ink-800 px-4 py-3 text-[12px] text-ink-400">
            <p className="mb-1 font-semibold text-gray-300">더미 데이터 모드 체험 계정 (비밀번호 {DEMO_PASSWORD})</p>
            <ul className="space-y-0.5">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    className="underline-offset-2 hover:text-white hover:underline"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                  >
                    {a.email}
                  </button>{' '}
                  · {a.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

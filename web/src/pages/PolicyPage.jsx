import { Link } from 'react-router-dom';
import { POLICIES, POLICY_OPERATOR, policyText } from '../constants/policies';
import useDocumentTitle from '../hooks/useDocumentTitle';

// 이용약관(/terms) · 개인정보 처리방침(/privacy): 로그인 없이 볼 수 있는 공개 페이지
// 앱 PolicyScreen과 같은 내용(constants/policies.js)
export default function PolicyPage({ kind }) {
  const policy = POLICIES[kind];
  useDocumentTitle(policy.title);

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <Link to="/login" className="text-[22px] font-black tracking-tight text-gray-900">
          Build<span className="text-brand-strong">Up</span>
        </Link>
        <h1 className="mt-4 text-[24px] font-extrabold text-gray-900">{policy.title}</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          시행일 {policy.effective} · {POLICY_OPERATOR}
        </p>
        <nav className="mt-3 flex gap-3 text-[13px]">
          <Link to="/terms" className={kind === 'terms' ? 'font-bold text-gray-900' : 'text-gray-600 hover:underline'}>
            이용약관
          </Link>
          <Link to="/privacy" className={kind === 'privacy' ? 'font-bold text-gray-900' : 'text-gray-600 hover:underline'}>
            개인정보 처리방침
          </Link>
        </nav>
        {policy.sections.map((s, i) => (
          <section key={i} className="mt-6">
            {s.h && <h2 className="mb-2 text-[16px] font-bold text-gray-900">{s.h}</h2>}
            {s.p.map((line, j) => (
              <p key={j} className="mb-1.5 text-[14px] leading-relaxed text-gray-700">
                {policyText(line)}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/common/Icon';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { homePathFor, USER_ROLE } from '../constants/enums';

// 회원가입: 역할 선택 → 정보 입력 (앱 RoleSelectScreen · SignUpScreen 과 같은 흐름·규칙)
// 서버: POST /api/auth/signup (AuthDtos.SignUpRequest). 성공하면 바로 로그인된다.

const ROLE_OPTIONS = [
  {
    role: USER_ROLE.ADMIN,
    title: '현장 관리자',
    desc: '현장을 만들고 작업자를 모아요',
    points: ['본사에 보고하거나, 본사 없이 최고 책임자로 운영', '6자리 참여 코드 발급·공유', '다른 현장에는 작업자로 참여할 수도 있어요'],
  },
  {
    role: USER_ROLE.WORKER,
    title: '일반 작업자',
    desc: '받은 코드로 현장에 참여해요',
    points: ['참여 코드로 현장 합류', '진행한 작업·진행률·사진 보고', '참여한 현장만 조회'],
  },
  {
    role: USER_ROLE.HQ,
    title: '본사 관계자',
    desc: '여러 현장의 보고와 자재 요청을 받아요',
    points: ['본사 코드 발급 → 현장 총관리자가 연결', '연결된 현장의 진척 보고 확인', '보고 승인 · 자재 요청 처리'],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 서버 SignUpRequest 길이 제한
const LIMIT = { NAME: 50, EMAIL: 120, PHONE: 20, PASSWORD_MIN: 8, PASSWORD_MAX: 64, COMPANY: 80 };

// 010-1234-5678 형태로 자동 하이픈 (앱과 같음)
function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900 aria-[invalid=true]:border-bad';

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-bad">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>
      )}
    </div>
  );
}

function Segment({ label, value, options, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-700">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(key)}
            className={`rounded-md py-2 text-[13px] font-semibold transition ${
              value === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoleStep({ role, setRole, onNext }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-6 shadow-xl">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">어떤 역할로 가입하시나요?</h1>
        <p className="mt-1 text-[12px] text-gray-500">작업자로 가입해도 나중에 앱의 내 정보에서 현장 관리자로 바꿀 수 있어요.</p>
      </div>
      <div role="radiogroup" aria-label="가입 역할" className="space-y-2">
        {ROLE_OPTIONS.map((o) => {
          const active = role === o.role;
          return (
            <button
              key={o.role}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(o.role)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                active ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{o.title}</p>
                  <p className="text-[12px] text-gray-500">{o.desc}</p>
                </div>
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active ? 'border-ink-900 bg-ink-900 text-white' : 'border-gray-300'
                  }`}
                >
                  {active && <Icon name="check" size={12} strokeWidth={3} />}
                </span>
              </div>
              <ul className="mt-2 space-y-0.5 text-[12px] text-gray-600">
                {o.points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!role}
        onClick={onNext}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-50"
      >
        다음
      </button>
    </div>
  );
}

function InfoStep({ role, onBack }) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === USER_ROLE.ADMIN;
  const isHq = role === USER_ROLE.HQ;

  const [hqMode, setHqMode] = useState('create'); // 본사: 새 본사 등록 / 본사 코드로 합류
  const [reportMode, setReportMode] = useState('top'); // 현장 관리자: 최고 책임자 / 본사에 보고
  const [f, setF] = useState({ name: '', company: '', companyCode: '', email: '', phone: '', password: '', password2: '' });
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    let v = e.target.value;
    if (key === 'phone') v = formatPhone(v);
    if (key === 'companyCode') v = v.replace(/\D/g, '').slice(0, 6);
    setF((prev) => ({ ...prev, [key]: v }));
    setServerError(null);
  };

  const needCode = (isAdmin && reportMode === 'hq') || (isHq && hqMode === 'join');
  const needHqName = isHq && hqMode === 'create';

  // 항목별 오류 (앱 SignUpScreen.validate 와 같은 순서·문구)
  const errors = {};
  if (!f.name.trim()) errors.name = '이름을 입력해 주세요.';
  if (needCode && !/^\d{6}$/.test(f.companyCode))
    errors.companyCode = isAdmin ? '보고할 본사의 코드 6자리를 입력해 주세요.' : '본사 코드 6자리를 입력해 주세요.';
  if (needHqName && !f.company.trim()) errors.company = '본사명을 입력해 주세요.';
  if (!EMAIL_RE.test(f.email.trim())) errors.email = '이메일 형식이 올바르지 않아요.';
  if (f.phone.replace(/\D/g, '').length < 10) errors.phone = '휴대폰 번호를 확인해 주세요.';
  if (f.password.length < LIMIT.PASSWORD_MIN) errors.password = '비밀번호는 8자 이상이어야 해요.';
  if (f.password2 !== f.password) errors.password2 = '비밀번호가 서로 달라요.';
  const show = (k) => (tried ? errors[k] : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const me = await signUp({
        role,
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone,
        password: f.password,
        company: isAdmin || needHqName ? f.company.trim() || null : null,
        companyCode: needCode ? f.companyCode : null,
      });
      navigate(homePathFor(me.role), { replace: true, state: { welcome: true } });
    } catch (err) {
      setServerError(err?.message ?? '가입하지 못했어요.');
      setSubmitting(false);
    }
  };

  const title = isHq ? '본사 관계자 가입' : isAdmin ? '현장 관리자 가입' : '일반 작업자 가입';
  const guide = isHq
    ? hqMode === 'create'
      ? '가입하면 6자리 본사 코드가 발급돼요. 현장 총관리자에게 알려 주면 현장이 본사에 연결돼요.'
      : '같은 본사의 다른 관계자에게 받은 본사 코드로 합류해요. 합류한 계정은 조회만 할 수 있어요.'
    : isAdmin
      ? reportMode === 'hq'
        ? '만드는 현장이 본사에 연결되어 보고와 자재 요청이 본사로 올라가요.'
        : '본사 없이 내가 최고 책임자로 운영해요. 보고와 자재 요청도 내가 최종 승인해요.'
      : '가입 후 현장 관리자에게 받은 6자리 참여 코드로 현장에 참여해요.';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="역할 다시 고르기"
          className="-ml-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="left" size={18} />
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">{title}</h1>
      </div>
      <p className="rounded-lg bg-brand-soft px-3 py-2 text-[12px] text-gray-800">{guide}</p>

      <Field id="su-name" label="이름" error={show('name')}>
        <input id="su-name" autoComplete="name" maxLength={LIMIT.NAME} value={f.name} onChange={set('name')}
          placeholder="홍길동" aria-invalid={!!show('name')} className={inputCls} />
      </Field>

      {isAdmin && (
        <>
          <Segment label="보고 체계" value={reportMode} onChange={setReportMode}
            options={[['top', '제가 최고 책임자예요'], ['hq', '본사에 보고해요']]} />
          {reportMode === 'hq' && (
            <Field id="su-code" label="본사 코드" error={show('companyCode')}>
              <input id="su-code" inputMode="numeric" value={f.companyCode} onChange={set('companyCode')}
                placeholder="본사 관계자에게 받은 6자리 숫자" aria-invalid={!!show('companyCode')} className={`${inputCls} tabular`} />
            </Field>
          )}
          <Field id="su-company" label="회사·사무소명 (선택)">
            <input id="su-company" maxLength={LIMIT.COMPANY} value={f.company} onChange={set('company')}
              placeholder={reportMode === 'hq' ? '비우면 본사 이름을 써요' : '예) 박철근 인력사무소'} className={inputCls} />
          </Field>
        </>
      )}

      {isHq && (
        <>
          <Segment label="본사" value={hqMode} onChange={setHqMode}
            options={[['create', '새 본사 등록'], ['join', '본사 코드로 합류']]} />
          {hqMode === 'create' ? (
            <Field id="su-company" label="본사명" error={show('company')}>
              <input id="su-company" maxLength={LIMIT.COMPANY} value={f.company} onChange={set('company')}
                placeholder="예) 한빛건설 본사" aria-invalid={!!show('company')} className={inputCls} />
            </Field>
          ) : (
            <Field id="su-code" label="본사 코드" error={show('companyCode')}>
              <input id="su-code" inputMode="numeric" value={f.companyCode} onChange={set('companyCode')}
                placeholder="6자리 숫자" aria-invalid={!!show('companyCode')} className={`${inputCls} tabular`} />
            </Field>
          )}
        </>
      )}

      <Field id="su-email" label="이메일" hint="로그인할 때 사용해요" error={show('email')}>
        <input id="su-email" type="email" autoComplete="email" maxLength={LIMIT.EMAIL} value={f.email} onChange={set('email')}
          placeholder="name@example.com" aria-invalid={!!show('email')} className={inputCls} />
      </Field>
      <Field id="su-phone" label="휴대폰 번호" error={show('phone')}>
        <input id="su-phone" type="tel" autoComplete="tel" maxLength={LIMIT.PHONE} value={f.phone} onChange={set('phone')}
          placeholder="010-0000-0000" aria-invalid={!!show('phone')} className={`${inputCls} tabular`} />
      </Field>
      <Field id="su-password" label="비밀번호" hint="8자 이상" error={show('password')}>
        <input id="su-password" type="password" autoComplete="new-password" maxLength={LIMIT.PASSWORD_MAX} value={f.password}
          onChange={set('password')} aria-invalid={!!show('password')} className={inputCls} />
      </Field>
      <Field id="su-password2" label="비밀번호 확인" error={show('password2')}>
        <input id="su-password2" type="password" autoComplete="new-password" maxLength={LIMIT.PASSWORD_MAX} value={f.password2}
          onChange={set('password2')} placeholder="한 번 더 입력" aria-invalid={!!show('password2')} className={inputCls} />
      </Field>

      {serverError && (
        <p role="alert" className="whitespace-pre-line rounded-lg bg-bad-soft px-3 py-2 text-[12px] text-bad">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-60"
      >
        {submitting ? '가입 중…' : '가입하기'}
      </button>
    </form>
  );
}

export default function SignUpPage() {
  const { isAuthenticated, restoring, user } = useAuth();
  const [role, setRole] = useState(null);
  const [step, setStep] = useState('role');
  useDocumentTitle('회원가입');

  if (!restoring && isAuthenticated) return <Navigate to={homePathFor(user?.role)} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-[30px] font-black tracking-tight text-white">
            Build<span className="text-brand">Up</span>
          </p>
          <p className="mt-1 text-sm text-ink-400">회원가입</p>
        </div>
        {step === 'role' ? (
          <RoleStep role={role} setRole={setRole} onNext={() => setStep('info')} />
        ) : (
          <InfoStep key={role} role={role} onBack={() => setStep('role')} />
        )}
        <p className="mt-4 text-center text-[13px] text-ink-400">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="font-semibold text-white hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

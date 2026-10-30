import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/common/Icon';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PolicyLinks from '../components/common/PolicyLinks';
import { homePathFor, USER_ROLE } from '../constants/enums';
import { KAKAO_LOGIN } from '../config';
import KakaoButton, { OrDivider } from '../components/domain/KakaoButton';
import VerifyField, { EMAIL_RE, PHONE_RE } from '../components/domain/VerifyField';

// 회원가입: 역할 선택 → 정보 입력 (앱 RoleSelectScreen · SignUpScreen 과 같은 흐름·규칙)
// 서버: POST /api/auth/signup (AuthDtos.SignUpRequest). 성공하면 바로 로그인된다.
// 가입 인증(이메일·휴대폰 필수)과 카카오 가입은 docs/API_약속.md 3번 "가입 인증"·"카카오 로그인".

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
    points: ['본사 코드 발급 → 현장 관리자가 연결', '연결된 현장의 진척 보고 확인', '보고 승인 · 자재 요청 처리'],
  },
];

// 서버 SignUpRequest 길이 제한
const LIMIT = { NAME: 50, PASSWORD_MIN: 8, PASSWORD_MAX: 64, COMPANY: 80 };

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

function RoleStep({ role, setRole, onNext, kakao }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-6 shadow-xl">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">어떤 역할로 가입하시나요?</h1>
        <p className="mt-1 text-[12px] text-gray-500">작업자로 가입해도 나중에 앱의 내 정보에서 현장 관리자로 바꿀 수 있어요.</p>
      </div>
      {kakao && <KakaoNotice kakao={kakao} />}
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
      {KAKAO_LOGIN && !kakao && (
        <>
          <OrDivider />
          <KakaoButton label="카카오로 가입하기" />
        </>
      )}
    </div>
  );
}

function KakaoNotice({ kakao }) {
  return (
    <p className="flex items-center gap-2 rounded-lg bg-[#FEE500]/40 px-3 py-2 text-[12px] text-gray-800">
      <span className="font-bold">카카오 계정으로 가입</span>
      <span className="truncate text-gray-600">{kakao.email ?? '이메일은 아래에서 입력·인증해 주세요'}</span>
    </p>
  );
}

// contact: { email, phone, emailToken, phoneToken } — 역할을 다시 골라도 인증한 값이 유지되도록 부모가 가진다
function InfoStep({ role, onBack, kakao, contact, setContact }) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === USER_ROLE.ADMIN;
  const isHq = role === USER_ROLE.HQ;

  const [hqMode, setHqMode] = useState('create'); // 본사: 새 본사 등록 / 본사 코드로 합류
  const [reportMode, setReportMode] = useState('top'); // 현장 관리자: 최고 책임자 / 본사에 보고
  const [f, setF] = useState({ name: kakao?.name ?? '', company: '', companyCode: '', password: '', password2: '' });
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // 필수 동의 3가지(앱 가입 화면과 같음)
  const [agree, setAgree] = useState({ age: false, terms: false, privacy: false });
  const allAgreed = agree.age && agree.terms && agree.privacy;

  // 카카오 가입: 비밀번호 없음. 카카오가 인증한 이메일이 오면 그 이메일 그대로(이메일 인증 생략). 휴대폰 인증은 항상
  const kakaoEmail = !!kakao?.email;
  const needPassword = !kakao;
  const needEmailVerify = !kakaoEmail;
  const email = kakaoEmail ? kakao.email : contact.email;

  const set = (key) => (e) => {
    let v = e.target.value;
    if (key === 'companyCode') v = v.replace(/\D/g, '').slice(0, 6);
    setF((prev) => ({ ...prev, [key]: v }));
    setServerError(null);
  };
  const setC = (patch) => {
    setContact((prev) => ({ ...prev, ...patch }));
    setServerError(null);
  };

  const needCode = (isAdmin && reportMode === 'hq') || (isHq && hqMode === 'join');
  const needHqName = isHq && hqMode === 'create';

  // 항목별 오류 (앱 SignUpScreen.validate 와 같은 순서·문구, 인증 문구는 서버와 같음)
  const errors = {};
  if (!f.name.trim()) errors.name = '이름을 입력해 주세요.';
  if (needCode && !/^\d{6}$/.test(f.companyCode))
    errors.companyCode = isAdmin ? '보고할 본사의 코드 6자리를 입력해 주세요.' : '본사 코드 6자리를 입력해 주세요.';
  if (needHqName && !f.company.trim()) errors.company = '본사명을 입력해 주세요.';
  if (!EMAIL_RE.test(email.trim())) errors.email = '이메일 형식이 올바르지 않아요.';
  else if (needEmailVerify && !contact.emailToken) errors.email = '이메일 인증을 완료해 주세요.';
  if (!PHONE_RE.test(contact.phone.replace(/\D/g, ''))) errors.phone = '휴대폰 번호를 확인해 주세요.';
  else if (!contact.phoneToken) errors.phone = '휴대폰 인증을 완료해 주세요.';
  if (needPassword && f.password.length < LIMIT.PASSWORD_MIN) errors.password = '비밀번호는 8자 이상이어야 해요.';
  if (needPassword && f.password2 !== f.password) errors.password2 = '비밀번호가 서로 달라요.';
  if (!allAgreed) errors.agree = '필수 약관에 모두 동의해 주세요.';
  const show = (k) => (tried ? errors[k] : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setServerError(null);
    try {
      // 서버 AuthDtos.SignUpRequest 와 같은 칸
      const me = await signUp({
        role,
        name: f.name.trim(),
        email: email.trim(),
        phone: contact.phone,
        password: needPassword ? f.password : null,
        company: needHqName ? f.company.trim() : null, // 현장 관리자 회사명은 DB에 칸이 없어 받지 않음
        companyCode: needCode ? f.companyCode : null,
        emailVerificationToken: needEmailVerify ? contact.emailToken : null,
        phoneVerificationToken: contact.phoneToken,
        signupToken: kakao?.signupToken ?? null,
        agreeAge: agree.age,
        agreeTerms: agree.terms,
        agreePrivacy: agree.privacy,
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
      ? '가입하면 6자리 본사 코드가 발급돼요. 현장 관리자에게 알려 주면 현장이 본사에 연결돼요.'
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
      {kakao && <KakaoNotice kakao={kakao} />}

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

      {kakaoEmail ? (
        <Field id="su-email" label="이메일" hint="카카오 계정 이메일 (인증 완료)">
          <input id="su-email" type="email" value={email} readOnly className={`${inputCls} bg-gray-50 text-gray-600`} />
        </Field>
      ) : (
        <VerifyField
          kind="email"
          id="su-email"
          value={contact.email}
          onChange={(v) => setC({ email: v })}
          token={contact.emailToken}
          onToken={(t) => setC({ emailToken: t })}
          error={show('email')}
        />
      )}
      <VerifyField
        kind="phone"
        id="su-phone"
        value={contact.phone}
        onChange={(v) => setC({ phone: v })}
        token={contact.phoneToken}
        onToken={(t) => setC({ phoneToken: t })}
        error={show('phone')}
      />

      {needPassword && (
        <>
          <Field id="su-password" label="비밀번호" hint="8자 이상" error={show('password')}>
            <input id="su-password" type="password" autoComplete="new-password" maxLength={LIMIT.PASSWORD_MAX} value={f.password}
              onChange={set('password')} aria-invalid={!!show('password')} className={inputCls} />
          </Field>
          <Field id="su-password2" label="비밀번호 확인" error={show('password2')}>
            <input id="su-password2" type="password" autoComplete="new-password" maxLength={LIMIT.PASSWORD_MAX} value={f.password2}
              onChange={set('password2')} placeholder="한 번 더 입력" aria-invalid={!!show('password2')} className={inputCls} />
          </Field>
        </>
      )}

      <fieldset className="rounded-lg border border-line px-3 py-2">
        <legend className="sr-only">약관 동의</legend>
        <label className="flex cursor-pointer items-center gap-2 py-1.5 text-[14px] font-bold text-gray-900">
          <input
            type="checkbox"
            checked={allAgreed}
            onChange={(e) => setAgree({ age: e.target.checked, terms: e.target.checked, privacy: e.target.checked })}
            className="h-4 w-4 accent-ink-900"
          />
          전체 동의하기
        </label>
        <div className="my-1 border-t border-line" />
        {[
          ['age', '만 14세 이상입니다', null],
          ['terms', '이용약관 동의', '/terms'],
          ['privacy', '개인정보 수집·이용 동의', '/privacy'],
        ].map(([key, label, href]) => (
          <div key={key} className="flex items-center justify-between gap-2 py-1">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-800">
              <input
                type="checkbox"
                checked={agree[key]}
                onChange={(e) => setAgree((a) => ({ ...a, [key]: e.target.checked }))}
                className="h-4 w-4 accent-ink-900"
              />
              <span>
                <span className="text-gray-500">[필수]</span> {label}
              </span>
            </label>
            {href && (
              // 새 탭으로 열어 입력하던 가입 내용이 사라지지 않게
              <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] text-gray-500 underline-offset-2 hover:underline">
                보기
              </a>
            )}
          </div>
        ))}
        {show('agree') && <p className="mt-1 text-[12px] text-bad">{show('agree')}</p>}
      </fieldset>

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
  const [contact, setContact] = useState({ email: '', phone: '', emailToken: null, phoneToken: null });
  // 카카오 콜백에서 넘어온 가입 정보 { signupToken, email, name }
  const kakao = useLocation().state?.kakao ?? null;
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
          <RoleStep role={role} setRole={setRole} onNext={() => setStep('info')} kakao={kakao} />
        ) : (
          <InfoStep key={role} role={role} onBack={() => setStep('role')} kakao={kakao} contact={contact} setContact={setContact} />
        )}
        <p className="mt-4 text-center text-[13px] text-ink-400">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="font-semibold text-white hover:underline">
            로그인
          </Link>
        </p>
        <PolicyLinks />
      </div>
    </div>
  );
}

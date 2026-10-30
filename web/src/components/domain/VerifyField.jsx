import { useEffect, useState } from 'react';
import Icon from '../common/Icon';
import { authApi } from '../../api/authApi';
import { USE_DUMMY } from '../../config';

// 가입 인증 칸 (이메일 · 휴대폰 공통): [인증 받기] → 6자리 입력 → [확인] → 인증 토큰
// 서버 규칙(API 약속 3번 "가입 인증"): 코드 5분 유효, 다시 받기는 60초 뒤, 5번 틀리면 다시 받기, 인증 후 값을 바꾸면 재인증

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 서버 SignupVerification.normalizePhone: 010·011·016~019 로 시작하는 10~11자리
export const PHONE_RE = /^01[016789]\d{7,8}$/;

// 010-1234-5678 형태로 자동 하이픈 (앱과 같음)
export function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

const KINDS = {
  email: {
    label: '이메일',
    hint: '로그인할 때 사용해요. [인증 받기]를 눌러 메일로 온 코드를 확인해 주세요.',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'name@example.com',
    maxLength: 120,
    valid: (v) => EMAIL_RE.test(v.trim()),
    clean: (v) => v,
    send: (v) => authApi.sendEmailCode(v.trim()),
    verify: (v, code) => authApi.verifyEmailCode(v.trim(), code).then((r) => r.emailVerificationToken),
    sentText: (v) => `${v.trim()}로 인증 코드를 보냈어요.`,
    doneText: '이메일 인증 완료',
  },
  // 비밀번호 찾기: 가입한 이메일로 코드 → resetToken
  password: {
    label: '이메일',
    hint: '가입한 이메일로 인증 코드를 보내 드려요.',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'name@example.com',
    maxLength: 120,
    valid: (v) => EMAIL_RE.test(v.trim()),
    clean: (v) => v,
    send: (v) => authApi.sendPasswordCode(v.trim()),
    verify: (v, code) => authApi.verifyPasswordCode(v.trim(), code).then((r) => r.resetToken),
    sentText: (v) => `${v.trim()}로 인증 코드를 보냈어요.`,
    doneText: '이메일 인증 완료',
  },
  phone: {
    label: '휴대폰 번호',
    hint: '[인증 받기]를 눌러 문자로 온 코드를 확인해 주세요.',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '010-0000-0000',
    maxLength: 13,
    valid: (v) => PHONE_RE.test(v.replace(/\D/g, '')),
    clean: formatPhone,
    send: (v) => authApi.sendPhoneCode(v),
    verify: (v, code) => authApi.verifyPhoneCode(v, code).then((r) => r.phoneVerificationToken),
    sentText: (v) => `${v}로 인증 문자를 보냈어요.`,
    doneText: '휴대폰 인증 완료',
  },
};

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900 aria-[invalid=true]:border-bad';
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function VerifyField({ kind, id, value, onChange, token, onToken, error }) {
  const k = KINDS[kind];
  const [sent, setSent] = useState(null); // { expiresAt, resendAt }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'send' | 'verify'
  const [msg, setMsg] = useState(null); // { bad, text }
  const [dummyCode, setDummyCode] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // 남은 시간 표시용 1초 타이머 (코드를 보낸 뒤 인증 전까지만)
  useEffect(() => {
    if (!sent || token) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent, token]);

  const left = sent ? Math.max(0, Math.ceil((sent.expiresAt - now) / 1000)) : 0;
  const resendLeft = sent ? Math.max(0, Math.ceil((sent.resendAt - now) / 1000)) : 0;

  const send = async () => {
    setBusy('send');
    setMsg(null);
    try {
      const r = await k.send(value);
      const t = Date.now();
      setSent({ expiresAt: t + r.expiresInSeconds * 1000, resendAt: t + r.resendAfterSeconds * 1000 });
      setNow(t);
      setCode('');
      setDummyCode(r.dummyCode ?? null);
      setMsg({ bad: false, text: k.sentText(value) });
    } catch (err) {
      setMsg({ bad: true, text: err?.message ?? '인증 코드를 보내지 못했어요.' });
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    setMsg(null);
    try {
      onToken(await k.verify(value, code));
    } catch (err) {
      setMsg({ bad: true, text: err?.message ?? '인증하지 못했어요.' });
    } finally {
      setBusy(null);
    }
  };

  // 인증 후(또는 코드를 받은 뒤) 값을 바꾸면 처음부터 다시
  const reset = () => {
    onToken(null);
    setSent(null);
    setCode('');
    setMsg(null);
    setDummyCode(null);
  };

  const shownError = token ? null : error;
  const codeId = `${id}-code`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-700">
        {k.label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={k.type}
          autoComplete={k.autoComplete}
          inputMode={kind === 'phone' ? 'numeric' : undefined}
          maxLength={k.maxLength}
          value={value}
          readOnly={!!token}
          onChange={(e) => {
            onChange(k.clean(e.target.value));
            if (sent) reset();
          }}
          placeholder={k.placeholder}
          aria-invalid={!!shownError}
          className={`${inputCls} ${kind === 'phone' ? 'tabular' : ''} ${token ? 'bg-gray-50 text-gray-600' : ''}`}
        />
        {token ? (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-lg border border-line px-3 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            변경
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!k.valid(value) || busy === 'send' || resendLeft > 0}
            className="w-[92px] shrink-0 rounded-lg bg-ink-900 px-2 text-[13px] font-semibold text-white hover:bg-ink-800 disabled:opacity-40"
          >
            {busy === 'send' ? '보내는 중…' : resendLeft > 0 ? `${resendLeft}초 후` : sent ? '다시 받기' : '인증 받기'}
          </button>
        )}
      </div>

      {token ? (
        <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-ok">
          <Icon name="check" size={14} strokeWidth={2.6} /> {k.doneText}
        </p>
      ) : (
        sent && (
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <label htmlFor={codeId} className="sr-only">
                {k.label} 인증 코드
              </label>
              <input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="인증 코드 6자리"
                className={`${inputCls} tabular pr-14 tracking-[0.2em]`}
              />
              <span
                className={`tabular absolute top-1/2 right-3 -translate-y-1/2 text-[12px] ${left > 0 ? 'text-bad' : 'text-gray-500'}`}
              >
                {mmss(left)}
              </span>
            </div>
            <button
              type="button"
              onClick={verify}
              disabled={code.length !== 6 || left === 0 || busy === 'verify'}
              className="w-[92px] shrink-0 rounded-lg border border-line px-2 text-[13px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              {busy === 'verify' ? '확인 중…' : '확인'}
            </button>
          </div>
        )
      )}

      {shownError ? (
        <p className="mt-1 text-[11px] text-bad">{shownError}</p>
      ) : (
        !sent && !token && <p className="mt-1 text-[11px] text-gray-500">{k.hint}</p>
      )}
      {!token && sent && left === 0 && <p className="mt-1 text-[11px] text-bad">인증 시간이 지났어요. 다시 받아 주세요.</p>}
      {msg && (
        <p role={msg.bad ? 'alert' : 'status'} className={`mt-1 text-[11px] ${msg.bad ? 'text-bad' : 'text-gray-500'}`}>
          {msg.text}
        </p>
      )}
      {USE_DUMMY && dummyCode && !token && (
        <p className="mt-1 rounded bg-brand-soft px-2 py-1 text-[11px] text-gray-700">
          더미 모드라 {kind === 'email' ? '메일' : '문자'} 대신 여기에 표시: 인증 코드 <b className="tabular">{dummyCode}</b>
        </p>
      )}
    </div>
  );
}

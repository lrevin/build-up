import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import Icon from '../components/common/Icon';
import VerifyField from '../components/domain/VerifyField';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/authApi';
import { sitesApi } from '../api/sitesApi';
import { HQ_ROLE_LABEL, USER_ROLE, USER_ROLE_LABEL } from '../constants/enums';

// 내 정보 (관리자·사용자 페이지 공통): 계정 정보, 비밀번호 변경, 회원 탈퇴 — 앱 '내 정보'와 같은 기능
// API 약속 3번 "비밀번호 찾기" · "회원 탈퇴"

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900 disabled:bg-gray-50';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const rows = [
    ['이름', user?.name],
    ['이메일', user?.email],
    ['휴대폰', user?.phone],
    ['구분', HQ_ROLE_LABEL[user?.hqRole] ?? USER_ROLE_LABEL[user?.role]],
    ...(user?.company ? [[user?.role === 'hq' ? '본사' : '회사', user.company]] : []),
    ...(user?.companyCode ? [['본사 코드', user.companyCode]] : []),
  ].filter(([, v]) => v);

  return (
    <>
      <PageHeader title="내 정보" subtitle="계정 정보와 비밀번호, 회원 탈퇴를 관리해요." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="계정 정보" />
          <dl className="px-5 pt-2 pb-4">
            {rows.map(([k, v], i) => (
              <div key={k} className={`flex justify-between gap-4 py-2.5 text-[13px] ${i > 0 ? 'border-t border-line' : ''}`}>
                <dt className="text-gray-500">{k}</dt>
                <dd className="truncate font-semibold text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <PasswordCard email={user?.email ?? ''} onDone={logout} />
      </div>
      {(user?.role === USER_ROLE.WORKER || user?.role === USER_ROLE.ADMIN) && <ManagerCard />}
      <WithdrawCard />
    </>
  );
}

// 비밀번호 찾기: 이메일 인증 → 새 비밀번호. 바꾸면 모든 기기에서 로그아웃
// 내 정보(onDone = 로그아웃)와 로그인 화면의 "비밀번호를 잊으셨나요?"(onDone = 로그인 화면으로)에서 쓴다
export function PasswordCard({ email: initialEmail = '', onDone }) {
  const toast = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setError('비밀번호는 8자 이상이어야 해요.');
    if (pw !== pw2) return setError('비밀번호가 서로 달라요.');
    setError(null);
    setSaving(true);
    try {
      await authApi.resetPassword({ email: email.trim(), resetToken: token, password: pw });
      toast.show('비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해 주세요.');
      onDone();
    } catch (err) {
      setError(err?.message ?? '비밀번호를 바꾸지 못했어요.');
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        // 로그인한 내 정보에서는 '비밀번호 변경', 로그인 화면에서 열면 '비밀번호 찾기'
        title={initialEmail ? '비밀번호 변경' : '비밀번호 찾기'}
        subtitle="이메일 인증 후 새 비밀번호를 정해요."
      />
      <form onSubmit={submit} className="space-y-3 px-5 pt-3 pb-5">
        <VerifyField kind="password" id="pw-email" value={email} onChange={setEmail} token={token} onToken={setToken} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pw-new" className="mb-1 block text-xs font-semibold text-gray-700">
              새 비밀번호
            </label>
            <input id="pw-new" type="password" autoComplete="new-password" value={pw} disabled={!token}
              onChange={(e) => setPw(e.target.value)} placeholder="8자 이상" className={inputCls} />
          </div>
          <div>
            <label htmlFor="pw-new2" className="mb-1 block text-xs font-semibold text-gray-700">
              새 비밀번호 확인
            </label>
            <input id="pw-new2" type="password" autoComplete="new-password" value={pw2} disabled={!token}
              onChange={(e) => setPw2(e.target.value)} placeholder="한 번 더 입력" className={inputCls} />
          </div>
        </div>
        {error && <p className="text-[12px] text-bad">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500">바꾸면 다른 휴대폰·웹에서도 로그아웃돼요.</p>
          <button type="submit" disabled={!token || saving}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-40">
            {saving ? '바꾸는 중…' : '비밀번호 바꾸기'}
          </button>
        </div>
      </form>
    </Card>
  );
}

// 회원 탈퇴: 한 번 더 확인(앱과 같은 문구) → 바로 로그아웃, 7일 뒤 계정 정보 영구 삭제
function WithdrawCard() {
  const { logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      const { deleteAt } = await authApi.withdraw();
      const d = new Date(deleteAt);
      toast.show(`탈퇴했어요. ${d.getMonth() + 1}월 ${d.getDate()}일에 계정 정보가 모두 삭제돼요.`);
      logout();
    } catch (err) {
      setError(err?.message ?? '탈퇴하지 못했어요.');
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4">
        <div>
          <p className="text-[14px] font-bold text-gray-900">회원 탈퇴</p>
          <p className="mt-0.5 text-[12px] text-gray-500">탈퇴하면 바로 로그아웃되고, 7일 뒤 계정 정보가 영구 삭제돼요.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)}
          className="rounded-lg border border-bad/40 px-4 py-2 text-[13px] font-bold text-bad hover:bg-bad-soft">
          회원 탈퇴
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
          role="dialog" aria-modal="true" aria-labelledby="withdraw-title" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-[380px] rounded-2xl bg-white px-6 pt-7 pb-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn">
              <Icon name="alert" size={24} strokeWidth={2.2} />
            </span>
            <h2 id="withdraw-title" className="mt-4 text-[28px] font-extrabold tracking-tight text-gray-900">
              정말 탈퇴할까요?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
              탈퇴 7일 후 계정 정보 및
              <br />
              모든 현장 정보가 삭제됩니다.
              <br />
              7일 후에는 되돌릴 수 없습니다.
            </p>
            {error && <p className="mt-3 text-[12px] text-bad">{error}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy}
                className="rounded-lg bg-gray-100 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-200">
                취소
              </button>
              <button type="button" onClick={withdraw} disabled={busy}
                className="rounded-lg bg-bad py-2.5 text-[14px] font-bold text-white hover:brightness-95 disabled:opacity-60">
                {busy ? '탈퇴하는 중…' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 현장 관리자로 전환(작업자) · 보고 체계 변경(현장 관리자) — 앱 '현장 관리자 전환'과 같음
// 최고 책임자: 본사 없이 현장 안에서 검토 / 본사에 보고: 본사 코드 6자리로 연결
function ManagerCard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const isWorker = user?.role === USER_ROLE.WORKER;
  const [mode, setMode] = useState(user?.company ? 'hq' : 'top');
  const [code, setCode] = useState('');
  const [hqName, setHqName] = useState(null); // 확인한 본사명
  const [linkSites, setLinkSites] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const check = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('본사 코드 6자리를 입력해 주세요.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setHqName(await sitesApi.previewCompany(code));
    } catch (err) {
      setHqName(null);
      setError(err?.message ?? '본사를 찾지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (mode === 'hq' && !hqName) {
      setError('본사 코드를 확인해 주세요.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authApi.setManager({ companyCode: mode === 'hq' ? code : null, linkSites: isWorker ? false : linkSites });
      await refreshUser();
      toast.show(isWorker ? '현장 관리자로 바꿨어요. 이제 새 현장을 만들 수 있어요.' : '보고 체계를 저장했어요.');
      setDone(isWorker);
      setCode('');
      setHqName(null);
    } catch (err) {
      setError(err?.message ?? '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const option = (value, title, desc) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      className={`rounded-xl border p-4 text-left ${mode === value ? 'border-ink-900 bg-gray-50' : 'border-line bg-white hover:bg-gray-50'}`}
    >
      <span className="text-[14px] font-bold text-gray-900">{title}</span>
      <span className="mt-1 block text-[11px] leading-5 text-gray-500">{desc}</span>
    </button>
  );

  return (
    <Card className="mt-4">
      <CardHeader
        title={isWorker ? '현장 관리자로 전환' : '보고 체계'}
        subtitle={
          isWorker
            ? '내 현장을 만들고 작업자를 모을 수 있어요. 지금 참여 중인 현장에서는 그대로 작업자예요.'
            : `지금: ${user?.company ? `${user.company}에 보고` : '최고 책임자 (본사 없이 운영)'}`
        }
      />
      <div className="space-y-3 px-5 pt-3 pb-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {option('top', '최고 책임자', '본사 없이 내가 보고를 검토하고 자재 요청을 처리해요.')}
          {option('hq', '본사에 보고', '본사 코드로 연결하면 본사가 보고를 검토하고 자재 요청을 처리해요.')}
        </div>
        {mode === 'hq' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={code}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setHqName(null);
                }}
                placeholder="본사 코드 6자리"
                aria-label="본사 코드"
                className={`${inputCls} tabular tracking-[0.15em]`}
              />
              <button
                type="button"
                onClick={check}
                disabled={busy}
                className="shrink-0 rounded-lg border border-line px-4 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                확인
              </button>
            </div>
            {hqName && (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
                <b className="text-gray-900">{hqName}</b>에 보고해요.
              </p>
            )}
          </div>
        )}
        {!isWorker && (
          <label className="flex items-center gap-2 text-[12px] text-gray-600">
            <input type="checkbox" checked={linkSites} onChange={(e) => setLinkSites(e.target.checked)} />
            내가 만든 현장들의 본사 연결도 같이 바꾸기
          </label>
        )}
        {error && <p className="text-[12px] text-bad">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {done && (
            <Link to="/my/sites/new" className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-gray-900 hover:bg-brand-strong">
              새 현장 만들기
            </Link>
          )}
          {!done && (
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-ink-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-ink-800 disabled:opacity-50"
            >
              {busy ? '저장 중…' : isWorker ? '현장 관리자로 전환' : '저장'}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

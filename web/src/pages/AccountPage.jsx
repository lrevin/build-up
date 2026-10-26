import { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import Icon from '../components/common/Icon';
import VerifyField from '../components/domain/VerifyField';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/authApi';
import { HQ_ROLE_LABEL, USER_ROLE_LABEL } from '../constants/enums';

// 내 정보 (관리자·사용자 페이지 공통): 계정 정보, 비밀번호 찾기, 회원 탈퇴 — 앱 '내 정보'와 같은 기능
// API 약속 3번 "비밀번호 찾기" · "회원 탈퇴"

const inputCls =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-ink-900 disabled:bg-gray-50';

export default function AccountPage() {
  const { user } = useAuth();
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
        <PasswordCard email={user?.email ?? ''} />
      </div>
      <WithdrawCard />
    </>
  );
}

// 비밀번호 찾기: 이메일 인증 → 새 비밀번호. 바꾸면 모든 기기에서 로그아웃
function PasswordCard({ email: initialEmail }) {
  const { logout } = useAuth();
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
      logout();
    } catch (err) {
      setError(err?.message ?? '비밀번호를 바꾸지 못했어요.');
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="비밀번호 찾기" subtitle="이메일 인증 후 새 비밀번호를 정해요." />
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

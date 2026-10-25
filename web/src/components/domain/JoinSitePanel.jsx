import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import Icon from '../common/Icon';
import { useToast } from '../common/Toast';
import { sitesApi } from '../../api/sitesApi';
import { useJoinSite } from '../../hooks/queries/useMyQueries';

// 참여 코드로 현장 참여: 코드 입력 → 현장 확인(미리보기) → 참여 (앱 JoinSiteScreen 과 같은 흐름)
export default function JoinSitePanel({ onClose }) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const join = useJoinSite();
  const toast = useToast();
  const navigate = useNavigate();

  const onCheck = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('참여 코드는 6자리 숫자예요.');
      return;
    }
    setChecking(true);
    setError(null);
    try {
      setPreview(await sitesApi.previewSite(code));
    } catch (err) {
      setError(err?.message ?? '현장을 확인하지 못했어요.');
    } finally {
      setChecking(false);
    }
  };

  const onJoin = () =>
    join.mutate(code, {
      onSuccess: (site) => {
        toast.show(`${site.name}에 참여했어요.`);
        navigate(`/my/sites/${site.id}`);
      },
      onError: (err) => setError(err?.message ?? '참여하지 못했어요.'),
    });

  return (
    <Card className="mb-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold text-gray-900">참여 코드로 현장 참여</p>
          <p className="text-[12px] text-gray-500">현장 관리자에게 받은 6자리 코드를 입력하세요.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <form onSubmit={onCheck} className="mt-3 flex gap-2">
        <label htmlFor="join-code" className="sr-only">참여 코드</label>
        <input
          id="join-code"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setPreview(null);
            setError(null);
          }}
          placeholder="000000"
          className="tabular w-40 rounded-lg border border-line px-3 py-2 text-[15px] tracking-[0.3em] outline-none focus:border-ink-900"
        />
        <button
          type="submit"
          disabled={checking || code.length !== 6}
          className="rounded-lg border border-line px-4 py-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {checking ? '확인 중…' : '현장 확인'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 whitespace-pre-line text-[12px] text-bad">
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-canvas px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-gray-900">{preview.name}</p>
            <p className="truncate text-[12px] text-gray-500">
              {preview.address || '주소 미입력'} · 총관리자 {preview.ownerName} · {preview.memberCount}명 참여 중
            </p>
          </div>
          {preview.alreadyJoined ? (
            <button
              type="button"
              onClick={() => navigate(`/my/sites/${preview.id}`)}
              className="rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50"
            >
              이미 참여 중 · 현장 보기
            </button>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              disabled={join.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-60"
            >
              {join.isPending ? '참여 중…' : '이 현장에 참여'}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

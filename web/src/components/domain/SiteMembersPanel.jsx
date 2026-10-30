import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../common/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../common/StateViews';
import { useToast } from '../common/Toast';
import { useLeaveSite, useRemoveMember, useSiteMembers } from '../../hooks/queries/useSiteQueries';
import { USER_ROLE_LABEL } from '../../constants/enums';
import { formatDateTime } from '../../services/format';

// 현장 참여자 (앱 '참여자' 화면과 같음): 목록, 현장 총관리자는 내보내기, 작업자는 현장 나가기
export default function SiteMembersPanel({ site, isOwner }) {
  const query = useSiteMembers(site.id);
  const remove = useRemoveMember(site.id);
  const leave = useLeaveSite(site.id);
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const onRemove = (m) => {
    if (!window.confirm(`${m.name}님을 이 현장에서 내보낼까요?\n이미 올린 보고는 그대로 남아요.`)) return;
    setError(null);
    remove.mutate(m.id, {
      onSuccess: () => toast.show(`${m.name}님을 내보냈어요.`),
      onError: (e) => setError(e.message),
    });
  };

  const onLeave = () => {
    if (!window.confirm(`'${site.name}' 현장에서 나갈까요?\n다시 참여하려면 참여 코드가 필요해요.`)) return;
    setError(null);
    leave.mutate(undefined, {
      onSuccess: () => {
        toast.show('현장에서 나왔어요.');
        navigate('/my', { replace: true });
      },
      onError: (e) => setError(e.message),
    });
  };

  const members = query.data ?? [];
  return (
    <Card>
      <CardHeader title="참여자" subtitle={`${members.length || site.memberCount}명 참여 중`} className="pb-2" />
      {query.isPending ? (
        <LoadingBlock />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : members.length === 0 ? (
        <EmptyState title="참여자가 없어요." />
      ) : (
        <ul className="px-5 pb-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-700">
                {m.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-gray-900">
                  {m.name}
                  {m.isOwner && (
                    <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-[#725300]">관리자</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500">
                  {USER_ROLE_LABEL[m.role] ?? m.role}
                  {m.phone ? ` · ${m.phone}` : ''} · 보고 {m.reportCount}건 · {formatDateTime(m.joinedAt)} 참여
                </p>
              </div>
              {isOwner && !m.isOwner && (
                <button
                  type="button"
                  onClick={() => onRemove(m)}
                  disabled={remove.isPending}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:border-bad/40 hover:text-bad disabled:opacity-50"
                >
                  내보내기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="px-5 pb-3 text-[12px] text-bad">{error}</p>}
      {!isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-[12px] text-gray-500">현장에서 나가도 이미 올린 보고는 그대로 남아요.</p>
          <button
            type="button"
            onClick={onLeave}
            disabled={leave.isPending}
            className="rounded-lg border border-bad/40 px-4 py-2 text-[13px] font-bold text-bad hover:bg-bad-soft disabled:opacity-50"
          >
            {leave.isPending ? '나가는 중…' : '현장 나가기'}
          </button>
        </div>
      )}
    </Card>
  );
}

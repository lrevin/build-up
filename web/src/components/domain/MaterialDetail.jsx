import { useState } from 'react';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { useToast } from '../common/Toast';
import MaterialStatusBadge from './MaterialStatusBadge';
import { useCancelMaterial, useSetMaterialStatus } from '../../hooks/queries/useMaterials';
import { useAuth } from '../../contexts/AuthContext';
import { MATERIAL_REJECT_REASONS, MATERIAL_STATUS, MATERIAL_STATUS_LABEL } from '../../constants/enums';
import { daysUntil, formatDateTime, formatRelative } from '../../services/format';

// 자재 요청 목록 한 줄 + 상세(승인/반려). 관리자 페이지와 사용자 페이지(현장 관리자)가 함께 쓴다.

export const itemsSummary = (items) =>
  items.length === 0 ? '-' : `${items[0].name} ${items[0].quantity}${items[0].unit}${items.length > 1 ? ` 외 ${items.length - 1}건` : ''}`;

export function NeededBy({ ymd }) {
  const d = daysUntil(ymd);
  if (d == null) return <span className="text-gray-500">필요일 미정</span>;
  const label = d < 0 ? `${-d}일 지남` : d === 0 ? '오늘까지' : `D-${d}`;
  return (
    <span className={d <= 1 ? 'font-semibold text-bad' : 'text-gray-600'}>
      {ymd.slice(5).replace('-', '/')} 필요 · {label}
    </span>
  );
}


export function MaterialListItem({ request: m, active, onClick, showSite = true }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(m.id)}
      className={`flex w-full items-center gap-3 border-b border-line px-5 py-3 text-left ${
        active ? 'bg-brand-soft/60' : 'hover:bg-gray-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-gray-500">
          {showSite ? m.siteName : '자재 요청'}
          {m.processName ? ` · ${m.processName}` : ''}
        </p>
        <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-gray-900">
          {m.urgent && <Badge tone="bad">긴급</Badge>}
          <span className="truncate">{itemsSummary(m.items)}</span>
        </p>
        <p className="text-[11px]">
          <NeededBy ymd={m.neededBy} />
          <span className="text-gray-500">
            {' '}
            · {m.author} · {formatRelative(m.createdAt)}
          </span>
        </p>
      </div>
      <MaterialStatusBadge status={m.status} />
    </button>
  );
}

export default function MaterialDetail({ request: m, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const mutation = useSetMaterialStatus();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const submit = (status) => {
    setError(null);
    if (status === MATERIAL_STATUS.REJECTED && !reason.trim()) {
      setError('반려 사유를 고르거나 적어 주세요.');
      return;
    }
    mutation.mutate(
      { requestId: m.id, status, reason: status === MATERIAL_STATUS.REJECTED ? reason.trim() : undefined },
      {
        onSuccess: () => {
          toast.show(status === MATERIAL_STATUS.APPROVED ? '자재 요청을 승인했어요.' : '자재 요청을 반려했어요.');
          onDone?.();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-gray-500">
            {m.siteName}
            {m.processName ? ` · ${m.processName}` : ' · 현장 공통'}
          </p>
          <p className="mt-0.5 text-[15px] font-bold text-gray-900">
            {m.author}님의 자재 요청 {m.urgent && <Badge tone="bad">긴급</Badge>}
          </p>
        </div>
        <MaterialStatusBadge status={m.status} />
      </div>

      <table className="w-full text-[13px]">
        <thead className="text-[11px] text-gray-500">
          <tr className="border-b border-line">
            <th className="py-1.5 text-left font-medium">자재</th>
            <th className="py-1.5 text-right font-medium">수량</th>
          </tr>
        </thead>
        <tbody>
          {m.items.map((it, i) => (
            <tr key={i} className="border-b border-line last:border-b-0">
              <td className="py-1.5 text-gray-800">{it.name}</td>
              <td className="tabular py-1.5 text-right font-semibold text-gray-900">
                {it.quantity.toLocaleString()} {it.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[12px]">
        <Icon name="clock" size={13} className="mr-1 inline align-[-2px] text-gray-500" />
        <NeededBy ymd={m.neededBy} />
      </p>
      {m.note && <p className="rounded-lg border border-line px-3 py-2 text-[12px] text-gray-700">{m.note}</p>}
      {m.rejectReason && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-[12px] text-bad">반려 사유 · {m.rejectReason}</p>
      )}

      <ol className="space-y-1 border-l-2 border-line pl-3 text-[11px] text-gray-500">
        {m.timeline.map((e, i) => (
          <li key={i}>
            <b className="font-semibold text-gray-700">{MATERIAL_STATUS_LABEL[e.status]}</b> · {e.by}
            {e.byHq ? ' (본사)' : ''} · {formatDateTime(e.at)}
          </li>
        ))}
      </ol>

      {m.canCancel && <CancelRequestButton request={m} />}

      {m.canApprove ? (
        rejecting ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {MATERIAL_REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] ${
                    reason === r ? 'border-ink-900 bg-ink-900 text-white' : 'border-line text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="반려 사유 직접 입력"
              aria-label="반려 사유"
              className="w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-ink-900"
            />
            {error && <p className="text-[12px] text-bad">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejecting(false);
                  setError(null);
                }}
                className="rounded-lg border border-line py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => submit(MATERIAL_STATUS.REJECTED)}
                className="rounded-lg bg-bad py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                반려하기
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-[12px] text-bad">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setRejecting(true)}
                className="rounded-lg border border-line py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                반려
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => submit(MATERIAL_STATUS.APPROVED)}
                className="rounded-lg bg-brand py-2.5 text-sm font-bold text-gray-900 hover:bg-brand-strong disabled:opacity-50"
              >
                {mutation.isPending ? '처리 중…' : '승인'}
              </button>
            </div>
          </>
        )
      ) : (
        m.status === MATERIAL_STATUS.REQUESTED && (
          <p className="rounded-lg border border-line px-3 py-2.5 text-[12px] text-gray-500">
            {user?.role === 'hq' && !user?.canReviewReports
              ? '본사 관리자만 자재 요청을 처리할 수 있어요. (현재 계정: 본사 직원)'
              : '이 요청을 처리할 권한이 없어요.'}
          </p>
        )
      )}
    </div>
  );
}

// 처리 전 본인 요청 취소(앱 자재 요청의 '요청 취소'와 같음)
function CancelRequestButton({ request }) {
  const cancel = useCancelMaterial();
  const toast = useToast();
  const [error, setError] = useState(null);

  const onCancel = () => {
    if (!window.confirm('이 자재 요청을 취소할까요?')) return;
    setError(null);
    cancel.mutate(
      { requestId: request.id, siteId: request.siteId },
      { onSuccess: () => toast.show('자재 요청을 취소했어요.'), onError: (e) => setError(e.message) },
    );
  };

  return (
    <div>
      {error && <p className="mb-2 text-[12px] text-bad">{error}</p>}
      <button
        type="button"
        onClick={onCancel}
        disabled={cancel.isPending}
        className="w-full rounded-lg border border-line py-2 text-[13px] font-semibold text-gray-700 hover:border-bad/40 hover:text-bad disabled:opacity-50"
      >
        {cancel.isPending ? '취소 중…' : '요청 취소'}
      </button>
    </div>
  );
}

import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import { useToast } from '../components/common/Toast';
import MaterialStatusBadge from '../components/domain/MaterialStatusBadge';
import { useHqMaterials, useSetMaterialStatus } from '../hooks/queries/useMaterials';
import { useHqSites } from '../hooks/queries/useHqQueries';
import { useAuth } from '../contexts/AuthContext';
import { MATERIAL_REJECT_REASONS, MATERIAL_STATUS, MATERIAL_STATUS_LABEL } from '../constants/enums';
import { daysUntil, formatDateTime, formatRelative } from '../services/format';

const TABS = [
  { key: MATERIAL_STATUS.REQUESTED, label: '처리 대기' },
  { key: MATERIAL_STATUS.APPROVED, label: MATERIAL_STATUS_LABEL.approved },
  { key: MATERIAL_STATUS.REJECTED, label: MATERIAL_STATUS_LABEL.rejected },
  { key: 'all', label: '전체' },
];

const itemsSummary = (items) =>
  items.length === 0 ? '-' : `${items[0].name} ${items[0].quantity}${items[0].unit}${items.length > 1 ? ` 외 ${items.length - 1}건` : ''}`;

function NeededBy({ ymd }) {
  const d = daysUntil(ymd);
  if (d == null) return <span className="text-gray-400">필요일 미정</span>;
  const label = d < 0 ? `${-d}일 지남` : d === 0 ? '오늘까지' : `D-${d}`;
  return (
    <span className={d <= 1 ? 'font-semibold text-bad' : 'text-gray-600'}>
      {ymd.slice(5).replace('-', '/')} 필요 · {label}
    </span>
  );
}

// 자재 요청 관리: 현장에서 올린 자재 요청을 본사 관리자가 승인 / 반려
export default function MaterialsPage() {
  const query = useHqMaterials();
  const { data: sites = [] } = useHqSites();
  const [tab, setTab] = useState(MATERIAL_STATUS.REQUESTED);
  const [siteId, setSiteId] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const inSite = all.filter((m) => siteId === 'all' || m.siteId === siteId);
  const counts = inSite.reduce(
    (c, m) => ({ ...c, all: c.all + 1, [m.status]: (c[m.status] ?? 0) + 1 }),
    { all: 0 },
  );
  // 처리 대기는 급한 것·필요일 빠른 것 먼저
  const list = inSite
    .filter((m) => tab === 'all' || m.status === tab)
    .sort((a, b) =>
      tab === MATERIAL_STATUS.REQUESTED
        ? Number(b.urgent) - Number(a.urgent) || String(a.neededBy).localeCompare(String(b.neededBy))
        : 0,
    );
  const selected = list.find((m) => m.id === selectedId) ?? list[0] ?? null;

  return (
    <>
      <PageHeader
        title="자재 요청"
        subtitle="현장에서 올린 자재 요청을 확인하고 승인하거나 반려합니다."
        right={
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setSelectedId(null);
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900"
            aria-label="현장 선택"
          >
            <option value="all">전체 현장</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="min-w-0">
          <div className="flex gap-1 border-b border-line px-3 pt-3" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelectedId(null);
                }}
                className={`-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${
                  tab === t.key ? 'border-ink-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label} <span className="tabular text-gray-400">{counts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {query.isPending ? (
            <LoadingBlock />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={query.refetch} />
          ) : list.length === 0 ? (
            <EmptyState title="해당하는 자재 요청이 없어요." />
          ) : (
            <ul>
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center gap-3 border-b border-line px-5 py-3 text-left ${
                      m.id === selected?.id ? 'bg-brand-soft/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-gray-500">
                        {m.siteName}
                        {m.processName ? ` · ${m.processName}` : ''}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-gray-900">
                        {m.urgent && <Badge tone="bad">긴급</Badge>}
                        <span className="truncate">{itemsSummary(m.items)}</span>
                      </p>
                      <p className="text-[11px]">
                        <NeededBy ymd={m.neededBy} />
                        <span className="text-gray-400"> · {m.author} · {formatRelative(m.createdAt)}</span>
                      </p>
                    </div>
                    <MaterialStatusBadge status={m.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start xl:sticky xl:top-6">
          <CardHeader title="요청 상세" className="pb-3" />
          {selected ? (
            <MaterialDetail key={selected.id} request={selected} onDone={() => setSelectedId(null)} />
          ) : (
            <EmptyState title="자재 요청을 선택하세요." />
          )}
        </Card>
      </div>
    </>
  );
}

function MaterialDetail({ request: m, onDone }) {
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
        <Icon name="clock" size={13} className="mr-1 inline align-[-2px] text-gray-400" />
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

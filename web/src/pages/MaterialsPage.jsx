import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import MaterialDetail, { MaterialListItem } from '../components/domain/MaterialDetail';
import { useHqMaterials } from '../hooks/queries/useMaterials';
import { useHqSites } from '../hooks/queries/useHqQueries';
import { useSite } from '../hooks/queries/useSiteQueries';
import SiteStockPanel from '../components/domain/SiteStockPanel';
import { MATERIAL_STATUS, MATERIAL_STATUS_LABEL } from '../constants/enums';

const TABS = [
  { key: MATERIAL_STATUS.REQUESTED, label: '처리 대기' },
  { key: MATERIAL_STATUS.APPROVED, label: MATERIAL_STATUS_LABEL.approved },
  { key: MATERIAL_STATUS.REJECTED, label: MATERIAL_STATUS_LABEL.rejected },
  { key: 'all', label: '전체' },
];

// 자재 요청 관리: 현장에서 올린 자재 요청을 본사 관리자가 승인 / 반려
export default function MaterialsPage() {
  const query = useHqMaterials();
  const { data: sites = [] } = useHqSites();
  const [tab, setTab] = useState(MATERIAL_STATUS.REQUESTED);
  const [siteId, setSiteId] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const stockQuery = useSite(siteId === 'all' ? null : siteId);

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

      {siteId !== 'all' && stockQuery.data && (
        <div className="mb-4">
          <SiteStockPanel site={stockQuery.data} />
        </div>
      )}

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
                  <MaterialListItem request={m} active={m.id === selected?.id} onClick={setSelectedId} />
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

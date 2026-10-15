import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import ReportListItem from '../components/domain/ReportListItem';
import ReportReviewPanel from '../components/domain/ReportReviewPanel';
import { flattenPages, useHqReports, useHqSites } from '../hooks/queries/useHqQueries';
import { REVIEW_STATUS, REVIEW_STATUS_LABEL } from '../constants/enums';

const TABS = [
  { key: REVIEW_STATUS.PENDING, label: REVIEW_STATUS_LABEL.pending },
  { key: REVIEW_STATUS.REVISION, label: REVIEW_STATUS_LABEL.revision },
  { key: REVIEW_STATUS.APPROVED, label: REVIEW_STATUS_LABEL.approved },
  { key: 'all', label: '전체' },
];

// 보고 승인: 상태·현장별로 걸러 보고, 선택한 보고를 승인/보완 요청
export default function ReportsPage() {
  const reportsQuery = useHqReports();
  const { data: sites = [] } = useHqSites();
  const [tab, setTab] = useState(REVIEW_STATUS.PENDING);
  const [siteId, setSiteId] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const all = useMemo(() => flattenPages(reportsQuery.data), [reportsQuery.data]);
  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, revision: 0 };
    all.forEach((r) => {
      if (siteId !== 'all' && r.siteId !== siteId) return;
      c.all += 1;
      c[r.review?.status] = (c[r.review?.status] ?? 0) + 1;
    });
    return c;
  }, [all, siteId]);

  const list = all.filter(
    (r) => (tab === 'all' || r.review?.status === tab) && (siteId === 'all' || r.siteId === siteId),
  );
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;

  return (
    <>
      <PageHeader
        title="보고 승인"
        subtitle="현장에서 올라온 보고를 확인하고 승인하거나 보완을 요청합니다."
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

          {reportsQuery.isPending ? (
            <LoadingBlock />
          ) : reportsQuery.isError ? (
            <ErrorState error={reportsQuery.error} onRetry={reportsQuery.refetch} />
          ) : list.length === 0 ? (
            <EmptyState title="해당하는 보고가 없어요." />
          ) : (
            <div>
              {list.map((r) => (
                <ReportListItem key={r.id} report={r} showSite active={r.id === selected?.id} onClick={setSelectedId} />
              ))}
            </div>
          )}

          {reportsQuery.hasNextPage && (
            <div className="border-t border-line p-3 text-center">
              <button
                type="button"
                onClick={() => reportsQuery.fetchNextPage()}
                disabled={reportsQuery.isFetchingNextPage}
                className="rounded-lg border border-line px-4 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {reportsQuery.isFetchingNextPage ? '불러오는 중…' : '이전 보고 더 보기'}
              </button>
            </div>
          )}
        </Card>

        <Card className="self-start xl:sticky xl:top-6">
          <CardHeader title="보고 상세" className="pb-3" />
          {selected ? (
            <ReportReviewPanel report={selected} onReviewed={() => setSelectedId(null)} />
          ) : (
            <EmptyState title="보고를 선택하세요." />
          )}
        </Card>
      </div>
    </>
  );
}

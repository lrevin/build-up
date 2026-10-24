import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardHeader } from '../../components/common/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/common/StateViews';
import ReportListItem from '../../components/domain/ReportListItem';
import ReportReviewPanel from '../../components/domain/ReportReviewPanel';
import { useMySites } from '../../hooks/queries/useMyQueries';
import { useSiteReports } from '../../hooks/queries/useSiteQueries';
import { flattenPages } from '../../hooks/queries/useHqQueries';
import { useAuth } from '../../contexts/AuthContext';
import { REVIEW_STATUS, REVIEW_STATUS_LABEL } from '../../constants/enums';

const TABS = [
  { key: 'all', label: '전체' },
  { key: REVIEW_STATUS.REVISION, label: REVIEW_STATUS_LABEL.revision },
  { key: REVIEW_STATUS.PENDING, label: REVIEW_STATUS_LABEL.pending },
  { key: REVIEW_STATUS.APPROVED, label: REVIEW_STATUS_LABEL.approved },
];

// 사용자 페이지: 보고 이력 (현장별, 기본은 내가 쓴 보고만)
export default function MyReportsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: sites = [], isPending: sitesPending } = useMySites();
  const siteId = params.get('site') ?? sites[0]?.id ?? null;
  const reportsQuery = useSiteReports(siteId);
  const [mineOnly, setMineOnly] = useState(true);
  const [tab, setTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const base = useMemo(() => {
    const all = flattenPages(reportsQuery.data);
    return mineOnly ? all.filter((r) => r.authorId === user?.id) : all;
  }, [reportsQuery.data, mineOnly, user?.id]);
  const counts = base.reduce((c, r) => ({ ...c, [r.review?.status]: (c[r.review?.status] ?? 0) + 1 }), { all: base.length });
  const list = base.filter((r) => tab === 'all' || r.review?.status === tab);
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;

  if (sitesPending) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="보고 이력"
        subtitle="보완 요청을 받은 보고는 내용을 보완해서 다시 제출할 수 있어요."
        right={
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-gray-700">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => {
                  setMineOnly(e.target.checked);
                  setSelectedId(null);
                }}
              />
              내 보고만
            </label>
            <select
              value={siteId ?? ''}
              onChange={(e) => {
                setParams({ site: e.target.value });
                setSelectedId(null);
              }}
              className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900"
              aria-label="현장 선택"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {!siteId ? (
        <Card>
          <EmptyState title="참여한 현장이 없어요." />
        </Card>
      ) : (
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
                  } ${t.key === REVIEW_STATUS.REVISION && counts.revision ? 'text-bad' : ''}`}
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
                  <ReportListItem key={r.id} report={r} active={r.id === selected?.id} onClick={setSelectedId} />
                ))}
              </div>
            )}
            {reportsQuery.hasNextPage && (
              <div className="border-t border-line p-3 text-center">
                <button
                  type="button"
                  onClick={() => reportsQuery.fetchNextPage()}
                  className="rounded-lg border border-line px-4 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  이전 보고 더 보기
                </button>
              </div>
            )}
          </Card>
          <Card className="self-start xl:sticky xl:top-6">
            <CardHeader title="보고 상세" className="pb-3" />
            {selected ? <ReportReviewPanel report={selected} /> : <EmptyState title="보고를 선택하세요." />}
          </Card>
        </div>
      )}
    </>
  );
}

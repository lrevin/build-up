import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import ProgressHistoryChart from '../components/domain/ProgressHistoryChart';
import ReportListItem from '../components/domain/ReportListItem';
import ReportReviewPanel from '../components/domain/ReportReviewPanel';
import PhotoTimeline from '../components/domain/PhotoTimeline';
import ProcessProgress from '../components/domain/ProcessProgress';
import WorklogExport from '../components/domain/WorklogExport';
import { PROGRESS_MODE, PROGRESS_MODE_LABEL } from '../constants/enums';
import { useSite, useSiteReports } from '../hooks/queries/useSiteQueries';
import { flattenPages } from '../hooks/queries/useHqQueries';
import { formatPercent, formatRelative } from '../services/format';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="tabular mt-0.5 truncate text-[17px] font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const siteQuery = useSite(siteId);
  const reportsQuery = useSiteReports(siteId);
  const [selectedId, setSelectedId] = useState(null);

  if (siteQuery.isPending) return <LoadingBlock />;
  if (siteQuery.isError) return <ErrorState error={siteQuery.error} onRetry={siteQuery.refetch} />;

  const site = siteQuery.data;
  const reports = flattenPages(reportsQuery.data);
  const pending = reports.filter((r) => r.canReview).length;
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  return (
    <>
      <Link to="/sites" className="mb-2 inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800">
        <Icon name="left" size={14} /> 현장 목록
      </Link>
      <PageHeader
        title={site.name}
        subtitle={`${site.workType ?? '공사 종류 미입력'} · ${site.address} · 진행률 ${PROGRESS_MODE_LABEL[site.progressMode ?? 'manual']}`}
        right={<WorklogExport siteId={site.id} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="전체 진행률" value={formatPercent(site.overallProgress)} />
        <Stat label="마지막 보고" value={formatRelative(site.lastReportedAt)} />
        <Stat label="검토 대기" value={`${pending}건`} />
        <Stat label="현장 관리자" value={site.ownerName} />
        <Stat label="참여 인원" value={`${site.memberCount}명`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4">
          {site.progressMode === PROGRESS_MODE.AUTO && (
            <Card>
              <CardHeader title="공정 현황" subtitle="공정별 진행률 × 비중으로 전체 진행률을 자동 계산" />
              <div className="px-5 pt-3 pb-4">
                <ProcessProgress processes={site.processes} reports={reports} overall={site.overallProgress} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="진행률 추이" subtitle="보고마다 기록된 현장 전체 진행률" />
            <div className="px-5 pt-2 pb-4">
              {reports.length > 0 ? <ProgressHistoryChart reports={reports} /> : <EmptyState title="아직 보고가 없어요." />}
            </div>
          </Card>

          <Card>
            <CardHeader title="보고 이력" right={`${reports.length}건`} className="pb-2" />
            {reportsQuery.isPending ? (
              <LoadingBlock />
            ) : reportsQuery.isError ? (
              <ErrorState error={reportsQuery.error} onRetry={reportsQuery.refetch} />
            ) : reports.length === 0 ? (
              <EmptyState title="보고 기록이 없어요." />
            ) : (
              <div>
                {reports.map((r) => (
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

          <Card>
            <CardHeader title="사진 타임라인" subtitle="촬영일 기준" className="pb-3" />
            <div className="px-5 pb-5">
              <PhotoTimeline reports={reports} />
            </div>
          </Card>
        </div>

        <Card className="self-start xl:sticky xl:top-6">
          <CardHeader title="보고 상세" className="pb-3" />
          {selected ? <ReportReviewPanel report={selected} /> : <EmptyState title="보고를 선택하세요." />}
        </Card>
      </div>
    </>
  );
}

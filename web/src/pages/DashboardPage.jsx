import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { Card, CardHeader } from '../components/common/Card';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import SiteCard from '../components/domain/SiteCard';
import ProgressHistoryChart from '../components/domain/ProgressHistoryChart';
import ReportListItem from '../components/domain/ReportListItem';
import ReportReviewPanel from '../components/domain/ReportReviewPanel';
import PhotoTimeline from '../components/domain/PhotoTimeline';
import { flattenPages, useHqReports, useHqSites } from '../hooks/queries/useHqQueries';
import { useSiteReports } from '../hooks/queries/useSiteQueries';
import { REVIEW_STATUS } from '../constants/enums';
import { formatFullDate, formatPercent, formatRelative, isToday } from '../services/format';

export default function DashboardPage() {
  const sitesQuery = useHqSites();
  const reportsQuery = useHqReports();
  const [search, setSearch] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const sites = useMemo(() => sitesQuery.data ?? [], [sitesQuery.data]);
  const allReports = useMemo(() => flattenPages(reportsQuery.data), [reportsQuery.data]);
  const pendingReports = allReports.filter((r) => r.review?.status === REVIEW_STATUS.PENDING);
  const todayCount = allReports.filter((r) => isToday(r.createdAt)).length;

  const filteredSites = useMemo(() => {
    const q = search.trim();
    if (!q) return sites;
    return sites.filter((s) => s.name.includes(q) || (s.workType ?? '').includes(q) || s.address.includes(q));
  }, [sites, search]);

  // 선택 현장 기본값: 검토 대기가 가장 많은 현장
  const siteId =
    selectedSiteId ?? [...sites].sort((a, b) => (b.pendingReviews ?? 0) - (a.pendingReviews ?? 0))[0]?.id ?? null;
  const site = sites.find((s) => s.id === siteId);

  // 오른쪽 패널: 직접 고른 보고, 없으면 첫 번째 검토 대기 보고
  const selectedReport =
    allReports.find((r) => r.id === selectedReportId) ?? pendingReports[0] ?? null;

  if (sitesQuery.isPending) return <LoadingBlock />;
  if (sitesQuery.isError) return <ErrorState error={sitesQuery.error} onRetry={sitesQuery.refetch} />;

  return (
    <>
      <PageHeader
        title="현장 대시보드"
        subtitle={`${formatFullDate()} · 관리 현장 ${sites.length}곳 · 오늘 보고 ${todayCount}건`}
        right={
          <label className="relative block w-64">
            <span className="sr-only">현장 검색</span>
            <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="현장명, 공사 종류로 검색"
              className="w-full rounded-lg border border-line bg-white py-2 pr-3 pl-9 text-[13px] outline-none focus:border-ink-900"
            />
          </label>
        }
      />

      {filteredSites.length === 0 ? (
        <Card>
          <EmptyState title="검색 결과가 없어요." />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {filteredSites.map((s) => (
            <SiteCard key={s.id} site={s} selected={s.id === siteId} onSelect={setSelectedSiteId} />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {site && <SiteOverview site={site} onSelectReport={setSelectedReportId} selectedReportId={selectedReport?.id} />}
        </div>

        <Card className="self-start xl:sticky xl:top-6">
          <CardHeader title="승인 대기 보고" right={`${pendingReports.length}건`} className="pb-3" />
          {reportsQuery.isPending ? (
            <LoadingBlock />
          ) : reportsQuery.isError ? (
            <ErrorState error={reportsQuery.error} onRetry={reportsQuery.refetch} />
          ) : selectedReport ? (
            <ReportReviewPanel report={selectedReport} onReviewed={() => setSelectedReportId(null)} />
          ) : (
            <EmptyState title="검토할 보고가 없어요." description="새 보고가 올라오면 여기에 표시돼요." />
          )}
          {pendingReports.length > 0 && (
            <ul className="border-t border-line">
              {pendingReports
                .filter((r) => r.id !== selectedReport?.id)
                .slice(0, 5)
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(r.id)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-[12px] hover:bg-gray-50"
                    >
                      <span className="min-w-0 truncate text-gray-700">
                        {r.siteName} · <span className="tabular">{formatPercent(r.to)}</span>
                      </span>
                      <span className="shrink-0 text-gray-400">{formatRelative(r.createdAt)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function SiteOverview({ site, onSelectReport, selectedReportId }) {
  const reportsQuery = useSiteReports(site.id);
  const reports = flattenPages(reportsQuery.data);

  return (
    <>
      <Card>
        <CardHeader
          title={`${site.name} 진척 현황`}
          subtitle={`${site.workType ?? '공사 종류 미입력'} · ${site.address} · 현장 관리자 ${site.ownerName} · ${site.memberCount}명`}
          right={
            <Link to={`/sites/${site.id}`} className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900">
              현장 상세 <Icon name="arrowRight" size={14} />
            </Link>
          }
        />
        <div className="px-5 pt-2 pb-4">
          {reportsQuery.isPending ? (
            <LoadingBlock />
          ) : reports.length === 0 ? (
            <EmptyState title="아직 보고가 없어요." />
          ) : (
            <ProgressHistoryChart reports={reports} />
          )}
          <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
            <span className="text-[12px] text-gray-500">
              전체 진행률
              <span className="ml-3 inline-flex items-center gap-1 text-[11px] text-gray-400">
                <i className="h-2 w-2 rounded-full bg-ink-900" /> 검토 완료
                <i className="ml-2 h-2 w-2 rounded-full bg-brand" /> 검토 대기
              </span>
            </span>
            <span className="tabular text-lg font-extrabold text-gray-900">{formatPercent(site.overallProgress)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="최근 보고 기록" right={`최근 ${Math.min(reports.length, 5)}건`} className="pb-2" />
        {reports.length === 0 ? (
          <EmptyState title="보고 기록이 없어요." />
        ) : (
          <div>
            {reports.slice(0, 5).map((r) => (
              <ReportListItem key={r.id} report={r} active={r.id === selectedReportId} onClick={onSelectReport} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="사진 타임라인"
          subtitle="촬영일 기준 · 최근 4일"
          right={
            <Link to={`/photos?site=${site.id}`} className="font-semibold text-gray-700 hover:text-gray-900">
              전체 보기
            </Link>
          }
          className="pb-3"
        />
        <div className="px-5 pb-5">
          <PhotoTimeline reports={reports} maxDays={4} />
        </div>
      </Card>
    </>
  );
}

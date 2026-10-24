import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import { useHqInfo, useHqSites } from '../hooks/queries/useHqQueries';
import { daysSince, formatPercent, formatRelative } from '../services/format';
import { STALE_REPORT_DAYS } from '../constants/enums';

// 현장 관리: 본사에 연결된 현장 목록 (현장 생성·참여는 모바일 앱에서 현장 관리자가 함)
export default function SitesPage() {
  const navigate = useNavigate();
  const sitesQuery = useHqSites();
  const { data: hq } = useHqInfo();
  const sites = sitesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="현장 관리"
        subtitle={hq ? `${hq.name} · 본사 코드 ${hq.code} · 연결 현장 ${hq.siteCount}곳` : '본사에 연결된 현장'}
      />
      <Card className="overflow-hidden">
        {sitesQuery.isPending ? (
          <LoadingBlock />
        ) : sitesQuery.isError ? (
          <ErrorState error={sitesQuery.error} onRetry={sitesQuery.refetch} />
        ) : sites.length === 0 ? (
          <EmptyState
            title="연결된 현장이 없어요."
            description="현장 관리자가 앱에서 본사 코드를 입력하면 여기에 표시돼요."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="border-b border-line bg-gray-50 text-[11px] font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-2.5">현장명</th>
                  <th className="px-3 py-2.5">공사 종류</th>
                  <th className="px-3 py-2.5">현장 관리자</th>
                  <th className="px-3 py-2.5 text-right">인원</th>
                  <th className="w-48 px-3 py-2.5">전체 진행률</th>
                  <th className="px-3 py-2.5">마지막 보고</th>
                  <th className="px-5 py-2.5 text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => {
                  const stale = daysSince(s.lastReportedAt) >= STALE_REPORT_DAYS;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/admin/sites/${s.id}`)}
                      className="cursor-pointer border-b border-line last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-[11px] text-gray-500">{s.address}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{s.workType ?? '-'}</td>
                      <td className="px-3 py-3 text-gray-700">{s.ownerName}</td>
                      <td className="tabular px-3 py-3 text-right text-gray-700">{s.memberCount}명</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={s.overallProgress} tone={stale ? 'bad' : 'dark'} />
                          <span className="tabular w-12 shrink-0 text-right font-semibold">
                            {formatPercent(s.overallProgress)}
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-3 ${stale ? 'font-semibold text-bad' : 'text-gray-700'}`}>
                        {formatRelative(s.lastReportedAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {s.pendingReviews > 0 ? (
                          <Badge tone="brand">검토 대기 {s.pendingReviews}</Badge>
                        ) : stale ? (
                          <Badge tone="bad">보고 지연</Badge>
                        ) : (
                          <Badge tone="ok">정상</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

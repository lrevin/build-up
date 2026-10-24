import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardHeader } from '../../components/common/Card';
import Icon from '../../components/common/Icon';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/common/StateViews';
import ProcessProgress from '../../components/domain/ProcessProgress';
import ProgressHistoryChart from '../../components/domain/ProgressHistoryChart';
import ReportListItem from '../../components/domain/ReportListItem';
import ReportReviewPanel from '../../components/domain/ReportReviewPanel';
import PhotoTimeline from '../../components/domain/PhotoTimeline';
import MaterialDetail, { MaterialListItem } from '../../components/domain/MaterialDetail';
import WorklogExport from '../../components/domain/WorklogExport';
import { useSite, useSiteReports } from '../../hooks/queries/useSiteQueries';
import { useSiteMaterials } from '../../hooks/queries/useMyQueries';
import { flattenPages } from '../../hooks/queries/useHqQueries';
import { useAuth } from '../../contexts/AuthContext';
import { PROGRESS_MODE, PROGRESS_MODE_LABEL } from '../../constants/enums';
import { formatPercent, formatRelative } from '../../services/format';

const TABS = [
  { key: 'reports', label: '보고' },
  { key: 'materials', label: '자재 요청' },
  { key: 'photos', label: '사진' },
];

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="tabular mt-0.5 truncate text-[17px] font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

// 사용자 페이지: 현장 상세 (작업자는 조회, 현장 총관리자는 보고 승인·자재 처리까지)
export default function MySiteDetailPage() {
  const { siteId } = useParams();
  const { user } = useAuth();
  const siteQuery = useSite(siteId);
  const reportsQuery = useSiteReports(siteId);
  const materialsQuery = useSiteMaterials(siteId);
  const [tab, setTab] = useState('reports');
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  if (siteQuery.isPending) return <LoadingBlock />;
  if (siteQuery.isError) return <ErrorState error={siteQuery.error} onRetry={siteQuery.refetch} />;

  const site = siteQuery.data;
  const isOwner = site.ownerId === user?.id;
  const allReports = flattenPages(reportsQuery.data);
  const reports = mineOnly ? allReports.filter((r) => r.authorId === user?.id) : allReports;
  const toReview = allReports.filter((r) => r.canReview).length;
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;
  const materials = materialsQuery.data ?? [];
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) ?? materials[0] ?? null;
  const isAuto = site.progressMode === PROGRESS_MODE.AUTO;

  return (
    <>
      <Link to="/my" className="mb-2 inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800">
        <Icon name="left" size={14} /> 내 현장
      </Link>
      <PageHeader
        title={site.name}
        subtitle={`${site.workType ?? '공사 종류 미입력'} · ${site.address} · 진행률 ${PROGRESS_MODE_LABEL[site.progressMode ?? 'manual']}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && site.code && (
              // 참여 코드는 총관리자에게만 내려온다. 작업자에게 알려 주면 웹·앱에서 참여할 수 있다.
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-gray-600">
                참여 코드 <b className="tabular tracking-[0.15em] text-gray-900">{site.code}</b>
              </span>
            )}
            {isOwner && <WorklogExport siteId={site.id} />}
            <Link
              to={`/my/report/new?site=${site.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-gray-900 hover:bg-brand-strong"
            >
              <Icon name="plus" size={15} strokeWidth={2.4} /> 보고 작성
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="전체 진행률" value={formatPercent(site.overallProgress)} />
        <Stat label="마지막 보고" value={formatRelative(site.lastReportedAt)} />
        <Stat label={isOwner ? '내가 검토할 보고' : '내 역할'} value={isOwner ? `${toReview}건` : '작업자'} />
        <Stat label="현장 관리자" value={`${site.ownerName} · ${site.memberCount}명`} />
      </div>

      <div className="mb-4 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 pb-2.5 text-[14px] font-semibold ${
              tab === t.key ? 'border-ink-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
            {t.key === 'materials' && materials.filter((m) => m.canApprove).length > 0 && (
              <span className="tabular ml-1.5 rounded-full bg-brand px-1.5 text-[11px] font-bold text-gray-900">
                {materials.filter((m) => m.canApprove).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader title={isAuto ? '공정 현황' : '진행률 추이'} />
              <div className="px-5 pt-3 pb-4">
                {isAuto ? (
                  <ProcessProgress processes={site.processes} reports={allReports} overall={site.overallProgress} />
                ) : allReports.length > 0 ? (
                  <ProgressHistoryChart reports={allReports} />
                ) : (
                  <EmptyState title="아직 보고가 없어요." />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="보고 이력"
                right={
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-gray-600">
                    <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                    내 보고만
                  </label>
                }
                className="pb-2"
              />
              {reportsQuery.isPending ? (
                <LoadingBlock />
              ) : reports.length === 0 ? (
                <EmptyState title="보고가 없어요." />
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
          </div>
          <Card className="self-start xl:sticky xl:top-6">
            <CardHeader title="보고 상세" className="pb-3" />
            {selected ? <ReportReviewPanel report={selected} /> : <EmptyState title="보고를 선택하세요." />}
          </Card>
        </div>
      )}

      {tab === 'materials' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card className="min-w-0">
            <CardHeader title="자재 요청" subtitle="요청은 모바일 앱에서 작성해요" className="pb-2" />
            {materialsQuery.isPending ? (
              <LoadingBlock />
            ) : materialsQuery.isError ? (
              <ErrorState error={materialsQuery.error} onRetry={materialsQuery.refetch} />
            ) : materials.length === 0 ? (
              <EmptyState title="자재 요청이 없어요." />
            ) : (
              <ul>
                {materials.map((m) => (
                  <li key={m.id}>
                    <MaterialListItem
                      request={m}
                      showSite={false}
                      active={m.id === selectedMaterial?.id}
                      onClick={setSelectedMaterialId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="self-start xl:sticky xl:top-6">
            <CardHeader title="요청 상세" className="pb-3" />
            {selectedMaterial ? (
              <MaterialDetail key={selectedMaterial.id} request={selectedMaterial} />
            ) : (
              <EmptyState title="자재 요청을 선택하세요." />
            )}
          </Card>
        </div>
      )}

      {tab === 'photos' && (
        <Card className="p-5">
          <PhotoTimeline reports={allReports} />
        </Card>
      )}
    </>
  );
}

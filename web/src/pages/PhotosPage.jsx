import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { EmptyState, ErrorState, LoadingBlock } from '../components/common/StateViews';
import PhotoTimeline from '../components/domain/PhotoTimeline';
import { flattenPages, useHqSites } from '../hooks/queries/useHqQueries';
import { useSiteReports } from '../hooks/queries/useSiteQueries';

// 사진 기록: 현장 하나를 골라 공사 과정을 날짜순으로 확인 (하자·분쟁 시 증빙 용도)
export default function PhotosPage() {
  const [params, setParams] = useSearchParams();
  const { data: sites = [], isPending: sitesPending } = useHqSites();
  const siteId = params.get('site') ?? sites[0]?.id ?? null;
  const reportsQuery = useSiteReports(siteId);
  const reports = flattenPages(reportsQuery.data);
  const photoCount = reports.reduce((n, r) => n + (r.photos?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        title="사진 기록"
        subtitle={siteId ? `사진 ${photoCount}장 · 촬영 시각·위치는 사진 정보(EXIF) 기준` : undefined}
        right={
          <select
            value={siteId ?? ''}
            onChange={(e) => setParams({ site: e.target.value })}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-ink-900"
            aria-label="현장 선택"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />
      <Card className="p-5">
        {sitesPending || reportsQuery.isPending ? (
          <LoadingBlock />
        ) : !siteId ? (
          <EmptyState title="연결된 현장이 없어요." />
        ) : reportsQuery.isError ? (
          <ErrorState error={reportsQuery.error} onRetry={reportsQuery.refetch} />
        ) : (
          <PhotoTimeline reports={reports} />
        )}
        {reportsQuery.hasNextPage && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => reportsQuery.fetchNextPage()}
              className="rounded-lg border border-line px-4 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              이전 사진 더 보기
            </button>
          </div>
        )}
      </Card>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import JoinSitePanel from '../../components/domain/JoinSitePanel';
import PageHeader from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Icon from '../../components/common/Icon';
import ProgressBar from '../../components/common/ProgressBar';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/common/StateViews';
import { useMySites } from '../../hooks/queries/useMyQueries';
import { useAuth } from '../../contexts/AuthContext';
import { PROGRESS_MODE, STALE_REPORT_DAYS, USER_ROLE } from '../../constants/enums';
import { daysSince, formatFullDate, formatPercent, formatRelative } from '../../services/format';

// 현장 목록 위 요약 숫자 4개: 관리하는 현장이 있으면 처리할 일, 작업자는 보고 현황
function Summary({ sites, ownerCount }) {
  const sum = (key) => sites.reduce((n, s) => n + (s.isOwner ? (s[key] ?? 0) : 0), 0);
  const avg = sites.reduce((n, s) => n + (s.overallProgress ?? 0), 0) / sites.length;
  const reportedToday = sites.filter((s) => daysSince(s.lastReportedAt) === 0).length;
  const stale = sites.filter((s) => daysSince(s.lastReportedAt) >= STALE_REPORT_DAYS).length;
  const reviews = sum('pendingReviews');
  const materials = sum('pendingMaterials');
  const tiles = [
    { label: '참여 현장', value: `${sites.length}곳`, sub: ownerCount ? `관리 ${ownerCount}곳` : '작업자로 참여' },
    { label: '평균 진행률', value: formatPercent(avg), sub: '참여 현장 전체' },
    ownerCount
      ? { label: '검토할 보고', value: `${reviews}건`, sub: '내가 관리하는 현장', alert: reviews > 0 }
      : { label: '오늘 보고', value: `${reportedToday}곳`, sub: '오늘 보고가 올라온 현장' },
    ownerCount
      ? { label: '승인 대기 자재', value: `${materials}건`, sub: '내가 관리하는 현장', alert: materials > 0 }
      : { label: '보고 없는 현장', value: `${stale}곳`, sub: `${STALE_REPORT_DAYS}일 넘게 보고 없음`, alert: stale > 0 },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="px-5 py-4">
          <p className="text-[12px] font-semibold text-gray-500">{t.label}</p>
          <p className={`tabular mt-1 text-[24px] leading-tight font-extrabold tracking-tight ${t.alert ? 'text-[#8a6400]' : 'text-gray-900'}`}>
            {t.value}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">{t.sub}</p>
        </Card>
      ))}
    </div>
  );
}

// 사용자 페이지 첫 화면: 내가 참여한 현장
export default function MySitesPage() {
  const { user } = useAuth();
  const { data: sites = [], isPending, isError, error, refetch } = useMySites();
  const ownerCount = sites.filter((s) => s.isOwner).length;
  const [joinOpen, setJoinOpen] = useState(false);
  const empty = !isPending && !isError && sites.length === 0;

  return (
    <>
      <PageHeader
        title={`${user?.name ?? ''}님의 현장`}
        subtitle={`${formatFullDate()} · 참여 현장 ${sites.length}곳${ownerCount ? ` (관리 ${ownerCount}곳)` : ''}`}
        right={
          !empty &&
          !joinOpen && (
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-bold text-gray-800 hover:bg-gray-50"
            >
              <Icon name="plus" size={14} strokeWidth={2.4} /> 참여 코드 입력
            </button>
          )
        }
      />

      {/* 현장이 없으면 바로 코드 입력부터 보여 준다 (가입 직후 첫 화면) */}
      {(empty || joinOpen) && <JoinSitePanel onClose={empty ? undefined : () => setJoinOpen(false)} />}

      {!isPending && !isError && sites.length > 0 && <Summary sites={sites} ownerCount={ownerCount} />}

      {isPending ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : sites.length === 0 ? (
        <Card>
          <EmptyState
            title="참여한 현장이 없어요."
            description={
              user?.role === USER_ROLE.ADMIN
                ? '받은 참여 코드가 있으면 위에 입력하세요. 새 현장 만들기는 모바일 앱에서 할 수 있어요.'
                : '현장 관리자에게 받은 참여 코드를 위에 입력하면 여기에 표시돼요.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => {
            const stale = daysSince(s.lastReportedAt) >= STALE_REPORT_DAYS;
            return (
              <Card key={s.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/my/sites/${s.id}`}
                      className="block truncate text-[15px] font-bold text-gray-900 hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="truncate text-[12px] text-gray-500">
                      {s.workType ?? '공사 종류 미입력'}
                      {s.progressMode === PROGRESS_MODE.AUTO && ' · 공정 자동 계산'}
                    </p>
                  </div>
                  <Badge tone={s.isOwner ? 'dark' : 'neutral'}>{s.isOwner ? '관리자' : '참여 중'}</Badge>
                </div>

                <p className="tabular mt-3 text-[30px] leading-none font-extrabold tracking-tight text-gray-900">
                  {formatPercent(s.overallProgress)}
                </p>
                <div className="mt-2">
                  <ProgressBar value={s.overallProgress} tone={stale ? 'bad' : 'dark'} />
                </div>
                <p className={`mt-2 text-[12px] ${stale ? 'font-semibold text-bad' : 'text-gray-500'}`}>
                  마지막 보고 · {formatRelative(s.lastReportedAt)}
                </p>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  {s.ownerName} · {s.memberCount}명{s.hqName ? ` · ${s.hqName}에 보고` : ' · 본사 없이 운영'}
                </p>

                {/* 할 일 배지 줄: 없어도 자리는 남겨 카드마다 버튼 높이를 맞춘다 */}
                <div className="mt-3 flex min-h-[22px] flex-wrap gap-1.5">
                  {s.isOwner && s.pendingReviews > 0 && <Badge tone="brand">검토할 보고 {s.pendingReviews}</Badge>}
                  {s.isOwner && s.pendingMaterials > 0 && <Badge tone="brand">자재 요청 {s.pendingMaterials}</Badge>}
                </div>

                {/* 버튼은 카드 맨 아래에 고정(같은 줄 카드는 높이가 같아 버튼 줄도 맞는다) */}
                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <Link
                    to={`/my/sites/${s.id}`}
                    className="rounded-lg border border-line py-2 text-center text-[13px] font-bold text-gray-800 hover:bg-gray-50"
                  >
                    현장 보기
                  </Link>
                  <Link
                    to={`/my/report/new?site=${s.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand py-2 text-[13px] font-bold text-gray-900 hover:bg-brand-strong"
                  >
                    <Icon name="plus" size={14} strokeWidth={2.4} /> 보고 작성
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

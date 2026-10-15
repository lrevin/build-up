import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import { daysSince, formatPercent, formatRelative } from '../../services/format';
import { STALE_REPORT_DAYS } from '../../constants/enums';

// 현장 카드: 현장명·공사 종류·전체 진행률·마지막 보고·검토 대기 배지 (계획서 화면 3)
export default function SiteCard({ site, selected = false, onSelect }) {
  const stale = daysSince(site.lastReportedAt) >= STALE_REPORT_DAYS;
  const pending = site.pendingReviews ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(site.id)}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-2 rounded-xl border bg-white p-4 text-left transition ${
        selected ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-gray-900">{site.name}</p>
          <p className="truncate text-[11px] text-gray-500">{site.workType ?? '공사 종류 미입력'}</p>
        </div>
        {pending > 0 ? (
          <Badge tone="brand">검토 대기 {pending}</Badge>
        ) : stale ? (
          <Badge tone="bad">보고 지연</Badge>
        ) : (
          <Badge tone="ok">정상</Badge>
        )}
      </div>
      <p className="tabular text-[26px] font-extrabold leading-none tracking-tight text-gray-900">
        {formatPercent(site.overallProgress)}
      </p>
      <p className={`text-[11px] ${stale ? 'font-semibold text-bad' : 'text-gray-500'}`}>
        마지막 보고 · {formatRelative(site.lastReportedAt)}
      </p>
      <ProgressBar value={site.overallProgress} tone={stale ? 'bad' : 'dark'} />
    </button>
  );
}

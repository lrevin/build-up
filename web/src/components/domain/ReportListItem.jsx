import ReviewBadge from './ReviewBadge';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { formatDelta, formatMonthDay, formatTime, workSummary } from '../../services/format';

// 보고 목록 한 줄. showSite: 여러 현장 보고가 섞인 목록에서 현장명 표시
export default function ReportListItem({ report, active = false, onClick, showSite = false }) {
  const thumbs = report.photos?.length ? report.photos.map((p) => p.url) : report.photoUris ?? [];
  const hasChecks = report.checks?.length > 0;
  const hasProcess = report.processTo != null && report.processName;

  return (
    <button
      type="button"
      onClick={() => onClick?.(report.id)}
      className={`flex w-full items-center gap-3 border-b border-line px-5 py-3 text-left last:border-b-0 ${
        active ? 'bg-brand-soft/60' : 'hover:bg-gray-50'
      }`}
    >
      <div className="w-14 shrink-0">
        <p className="text-[12px] font-bold text-gray-900">{formatMonthDay(report.createdAt)}</p>
        <p className="tabular text-[11px] text-gray-500">{formatTime(report.createdAt)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {thumbs.slice(0, 2).map((src, i) => (
          <img key={i} src={src} alt="" className="h-9 w-9 rounded-md object-cover" loading="lazy" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {showSite && <p className="truncate text-[11px] text-gray-500">{report.siteName}</p>}
        <p className="flex items-center gap-1.5 truncate text-[13px] text-gray-800">
          {hasProcess && <Badge tone="neutral">{report.processName}</Badge>}
          <span className="truncate">{workSummary(report.work, report.processName)}</span>
          <span className="shrink-0 text-gray-400">(사진 {thumbs.length}장)</span>
        </p>
        <p className="tabular text-[11px] text-gray-500">
          {report.author} · 전체 {report.to.toFixed(1)}% ({formatDelta(report.from, report.to)})
          {hasProcess && ` · ${report.processName} ${report.processTo.toFixed(1)}%`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <ReviewBadge status={report.review?.status} />
        {hasChecks && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-warn">
            <Icon name="alert" size={12} /> 확인 필요
          </span>
        )}
      </div>
    </button>
  );
}

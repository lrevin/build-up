import { clampPercent } from '../../services/format';

// value: 확정 진행률, pending: 검토 대기 중인 증가분 위치(선택)
export default function ProgressBar({ value, pendingTo, tone = 'dark', height = 'h-1.5' }) {
  const v = clampPercent(value);
  const p = pendingTo != null ? clampPercent(pendingTo) : null;
  const fill = tone === 'bad' ? 'bg-bad' : 'bg-ink-900';
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-gray-200 ${height}`}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {p != null && p > v && (
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${p}%` }} />
      )}
      <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${v}%` }} />
    </div>
  );
}

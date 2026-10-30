import { useMemo } from 'react';
import { formatMonthDay, formatPercent } from '../../services/format';
import { REVIEW_STATUS } from '../../constants/enums';

// 승인된 보고만 실제 진행률 추이에 포함한다. 대기·보완 요청 값은 검토 패널에서 제안값으로만 보여 준다.
const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 36 };

export default function ProgressHistoryChart({ reports }) {
  const points = useMemo(() => {
    const sorted = reports
      .filter((report) => report.review?.status === REVIEW_STATUS.APPROVED)
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    if (sorted.length === 0) return [];
    const t0 = new Date(sorted[0].createdAt).getTime();
    const t1 = new Date(sorted[sorted.length - 1].createdAt).getTime();
    const span = Math.max(t1 - t0, 1);
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    return sorted.map((r) => ({
      id: r.id,
      x: PAD.left + ((new Date(r.createdAt).getTime() - t0) / span) * iw,
      y: PAD.top + ih - (r.to / 100) * ih,
      to: r.to,
      date: r.createdAt,
    }));
  }, [reports]);

  if (points.length === 0) return null;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const baseY = H - PAD.bottom;
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${baseY} L${points[0].x.toFixed(1)},${baseY} Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="진행률 추이 그래프">
      {[0, 25, 50, 75, 100].map((v) => {
        const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / 100);
        return (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#eef0f2" />
            <text x={PAD.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
              {v}
            </text>
          </g>
        );
      })}
      <path d={area} fill="#121823" fillOpacity="0.06" />
      <path d={line} fill="none" stroke="#121823" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#121823"
          stroke="#fff"
          strokeWidth="1.5"
        >
          <title>{`${formatMonthDay(p.date)} · ${formatPercent(p.to)}`}</title>
        </circle>
      ))}
      <text x={first.x} y={H - 6} fontSize="10" fill="#9ca3af">
        {formatMonthDay(first.date)}
      </text>
      <text x={last.x} y={H - 6} fontSize="10" fill="#9ca3af" textAnchor="end">
        {formatMonthDay(last.date)}
      </text>
    </svg>
  );
}

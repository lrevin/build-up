import ProgressBar from '../common/ProgressBar';
import { formatPercent } from '../../services/format';
import { REVIEW_STATUS } from '../../constants/enums';

// 공정 가중치 자동 계산 현장의 공정별 진행률 (계획서 화면 3 '공정 현황')
// processes: Site.processes, reports: 이 현장 보고 (검토 대기 증가분을 노란색으로 표시)
export default function ProcessProgress({ processes, reports = [], overall }) {
  if (!processes?.length) return null;

  // 공정별로 가장 최근의 '검토 대기' 보고 값
  const pendingTo = {};
  reports.forEach((r) => {
    if (r.review?.status === REVIEW_STATUS.PENDING && r.processKey && pendingTo[r.processKey] == null) {
      pendingTo[r.processKey] = r.processTo;
    }
  });
  // 확정 진행률 = 검토 대기 보고 직전 값
  const confirmed = {};
  reports.forEach((r) => {
    if (r.review?.status === REVIEW_STATUS.PENDING && r.processKey) confirmed[r.processKey] = r.processFrom;
  });

  const weightSum = processes.reduce((s, p) => s + p.weight, 0);

  return (
    <div>
      <ul className="space-y-3">
        {processes.map((p) => {
          const pending = pendingTo[p.key];
          const base = pending != null ? confirmed[p.key] ?? p.progress : p.progress;
          return (
            <li key={p.key} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-3">
              <div>
                <p className="text-[13px] font-bold text-gray-900">{p.name}</p>
                <p className="text-[11px] text-gray-500">비중 {p.weight}%</p>
              </div>
              <ProgressBar value={base} pendingTo={pending} height="h-2" />
              <span className="tabular text-right text-[13px] font-semibold text-gray-800">
                {formatPercent(pending ?? p.progress)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-sm bg-ink-900" /> 승인된 진행률
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-2 w-2 rounded-sm bg-brand" /> 승인 대기
        </span>
        {weightSum !== 100 && <span className="text-bad">가중치 합계 {weightSum}%</span>}
        {overall != null && (
          <span className="ml-auto">
            전체 = Σ(공정 진행률 × 비중) = <b className="tabular text-gray-800">{formatPercent(overall)}</b>
          </span>
        )}
      </div>
    </div>
  );
}

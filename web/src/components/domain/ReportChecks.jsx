import Icon from '../common/Icon';
import { REPORT_CHECK_LABEL } from '../../constants/enums';

// 서버가 제출 시 자동 검사한 결과(report_checks): 허위·지연 보고 의심 항목
export default function ReportChecks({ checks }) {
  if (!checks?.length) return null;
  return (
    <ul className="space-y-1.5 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5">
      {checks.map((c, i) => (
        <li key={i} className="flex gap-2 text-[12px] text-warn">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          <span>
            <b className="font-semibold">{REPORT_CHECK_LABEL[c.type] ?? c.type}</b> · {c.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

import Badge from '../common/Badge';
import { REVIEW_STATUS, REVIEW_STATUS_LABEL } from '../../constants/enums';

const TONE = {
  [REVIEW_STATUS.PENDING]: 'brand',
  [REVIEW_STATUS.APPROVED]: 'ok',
  [REVIEW_STATUS.REVISION]: 'bad',
};

export default function ReviewBadge({ status }) {
  if (!status) return null;
  return <Badge tone={TONE[status] ?? 'neutral'}>{REVIEW_STATUS_LABEL[status] ?? status}</Badge>;
}

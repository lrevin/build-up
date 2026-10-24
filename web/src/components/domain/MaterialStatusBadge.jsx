import Badge from '../common/Badge';
import { MATERIAL_STATUS, MATERIAL_STATUS_LABEL } from '../../constants/enums';

const TONE = {
  [MATERIAL_STATUS.REQUESTED]: 'brand',
  [MATERIAL_STATUS.APPROVED]: 'ok',
  [MATERIAL_STATUS.REJECTED]: 'bad',
};

export default function MaterialStatusBadge({ status }) {
  if (!status) return null;
  return <Badge tone={TONE[status] ?? 'neutral'}>{MATERIAL_STATUS_LABEL[status] ?? status}</Badge>;
}

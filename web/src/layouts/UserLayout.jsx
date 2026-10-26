import { Link } from 'react-router-dom';
import AppShell from './AppShell';
import Icon from '../components/common/Icon';
import { useMySites } from '../hooks/queries/useMyQueries';

// 사용자 페이지 (현장 관리자 · 작업자)
const NAV = [
  { to: '/my', label: '내 현장', icon: 'sites', end: true, badge: 'pending' },
  { to: '/my/reports', label: '보고 이력', icon: 'review' },
  { to: '/my/account', label: '내 정보', icon: 'user' },
];

export default function UserLayout() {
  const { data: sites } = useMySites();
  // 현장 관리자는 자기 현장에서 검토할 보고 수가 표시된다 (작업자는 항상 0)
  const badges = { pending: sites?.reduce((n, s) => n + (s.pendingReviews ?? 0), 0) ?? 0 };

  return (
    <AppShell
      caption="현장 보고"
      nav={NAV}
      badges={badges}
      action={
        <Link
          to="/my/report/new"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2.5 text-[13px] font-bold text-gray-900 hover:bg-brand-strong"
        >
          <Icon name="plus" size={16} strokeWidth={2.4} /> 보고 작성
        </Link>
      }
    />
  );
}

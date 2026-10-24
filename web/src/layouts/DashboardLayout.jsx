import AppShell from './AppShell';
import { useHqSites } from '../hooks/queries/useHqQueries';

// 관리자 페이지 (본사 관계자)
const NAV = [
  { to: '/admin', label: '대시보드', icon: 'dashboard', end: true },
  { to: '/admin/sites', label: '현장 관리', icon: 'sites' },
  { to: '/admin/reports', label: '보고 승인', icon: 'review', badge: 'pending' },
  { to: '/admin/materials', label: '자재 요청', icon: 'box', badge: 'materials' },
  { to: '/admin/photos', label: '사진 기록', icon: 'photo' },
];

export default function DashboardLayout() {
  const { data: sites } = useHqSites();
  const badges = {
    pending: sites?.reduce((n, s) => n + (s.pendingReviews ?? 0), 0) ?? 0,
    materials: sites?.reduce((n, s) => n + (s.pendingMaterials ?? 0), 0) ?? 0,
  };
  return <AppShell caption="본사 관리자" nav={NAV} badges={badges} />;
}

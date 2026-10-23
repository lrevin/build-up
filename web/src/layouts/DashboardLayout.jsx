import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useHqSites } from '../hooks/queries/useHqQueries';
import { HQ_ROLE_LABEL, USER_ROLE_LABEL } from '../constants/enums';
import { USE_DUMMY } from '../config';

const NAV = [
  { to: '/', label: '대시보드', icon: 'dashboard', end: true },
  { to: '/sites', label: '현장 관리', icon: 'sites' },
  { to: '/reports', label: '보고 승인', icon: 'review', badge: 'pending' },
  { to: '/materials', label: '자재 요청', icon: 'box', badge: 'materials' },
  { to: '/photos', label: '사진 기록', icon: 'photo' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2 px-5 pt-6 pb-8">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 26V14h5v12zm7.5 0V8h5v18zM21 26v-8h5v8z" fill="#f5b400" />
      </svg>
      <span className="text-[22px] font-black tracking-tight text-white">
        Build<span className="text-brand">Up</span>
      </span>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { data: sites } = useHqSites();
  const badges = {
    pending: sites?.reduce((n, s) => n + (s.pendingReviews ?? 0), 0) ?? 0,
    materials: sites?.reduce((n, s) => n + (s.pendingMaterials ?? 0), 0) ?? 0,
  };

  return (
    <div className="flex h-full min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-ink-950 text-gray-300">
        <Logo />
        <nav className="flex-1 space-y-1 px-3" aria-label="주 메뉴">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-ink-800 text-white shadow-[inset_3px_0_0_var(--color-brand)]'
                    : 'text-gray-400 hover:bg-ink-900 hover:text-gray-200'
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              <span className="flex-1">{item.label}</span>
              {item.badge && badges[item.badge] > 0 && (
                <span className="tabular rounded-full bg-brand px-1.5 text-[11px] font-bold text-gray-900">
                  {badges[item.badge]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {USE_DUMMY && (
          <p className="mx-3 mb-3 rounded-md border border-ink-700 px-2.5 py-1.5 text-[11px] text-ink-400">
            더미 데이터 모드 · 새로고침하면 초기화
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-ink-800 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-400">
              {user?.company ? `${user.company} · ` : ''}
              {HQ_ROLE_LABEL[user?.hqRole] ?? USER_ROLE_LABEL[user?.role] ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-7 py-6">
        <Outlet />
      </main>
    </div>
  );
}

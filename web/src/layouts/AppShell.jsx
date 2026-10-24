import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { useAuth } from '../contexts/AuthContext';
import { HQ_ROLE_LABEL, USER_ROLE_LABEL } from '../constants/enums';
import { USE_DUMMY } from '../config';
import useDocumentTitle from '../hooks/useDocumentTitle';

function Logo({ caption }) {
  return (
    <div className="px-5 pt-6 pb-7">
      <div className="flex items-center gap-2">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 26V14h5v12zm7.5 0V8h5v18zM21 26v-8h5v8z" fill="#f5b400" />
        </svg>
        <span className="text-[22px] font-black tracking-tight text-white">
          Build<span className="text-brand">Up</span>
        </span>
      </div>
      {caption && <p className="mt-1 pl-0.5 text-[11px] font-semibold tracking-wide text-ink-400">{caption}</p>}
    </div>
  );
}

// 관리자 페이지 · 사용자 페이지가 함께 쓰는 틀: 고정 사이드바 + 본문
// nav: [{ to, label, icon, end?, badge? }], badges: { [key]: number }, action: 메뉴 위 주요 버튼
export default function AppShell({ caption, nav, badges = {}, action }) {
  const { user, logout } = useAuth();
  useDocumentTitle(caption);

  return (
    // 바깥 상자는 내용만큼 늘어나야(min-h-screen) sticky 사이드바가 스크롤 끝까지 고정된다
    <div className="flex min-h-screen items-start">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto bg-ink-950 text-gray-300">
        <Logo caption={caption} />
        {action && <div className="px-3 pb-4">{action}</div>}
        <nav className="flex-1 space-y-1 px-3" aria-label="주 메뉴">
          {nav.map((item) => (
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

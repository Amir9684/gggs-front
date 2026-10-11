import { Link, Outlet } from 'react-router';

import { RoleBadge } from './RoleBadge';
import { RoleGate } from './auth/RoleGate';
import { useAuth } from '../context/useAuth';
import { UserRole } from '../types/user';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border-soft bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-mono text-sm tracking-wide text-copper-text">
              <span className="inline-block h-2 w-2 rounded-full bg-copper" />
              GGGS
            </Link>
            <nav className="flex items-center gap-4 text-sm text-text-muted">
              <Link to="/" className="transition-colors hover:text-text">
                پروژه‌ها
              </Link>
              <RoleGate roles={[UserRole.ADMIN]}>
                <Link to="/admin/users" className="transition-colors hover:text-text">
                  مدیریت کاربران
                </Link>
              </RoleGate>
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text">{user.username}</span>
              <RoleBadge role={user.role} />
              <button
                onClick={logout}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
              >
                خروج
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
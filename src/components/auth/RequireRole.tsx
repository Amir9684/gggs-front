import { Navigate, Outlet } from 'react-router';

import { useAuth } from '../../context/useAuth';
import type { UserRole } from '../../types/user';

interface RequireRoleProps {
  roles: UserRole[];
}

/**
 * Mirrors the backend's `@Auth(...roles)` / `RolesGuard` on the client:
 * restricts a route subtree to specific roles. Must sit *inside* a
 * `RequireAuth` (or another element that guarantees `user` is set) — it
 * assumes authentication already happened and only checks role.
 *
 * This is UX only, not a security boundary — the real enforcement is the
 * backend's RolesGuard. Hiding a route here just avoids showing an admin
 * screen to a reviewer who'd get a 403 the moment they tried to use it.
 */
export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
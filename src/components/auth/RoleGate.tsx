import type { ReactNode } from 'react';

import { useAuth } from '../../context/useAuth';
import type { UserRole } from '../../types/user';

interface RoleGateProps {
  roles: UserRole[];
  children: ReactNode;
  /** Rendered instead when the current user's role isn't allowed. */
  fallback?: ReactNode;
}

/**
 * For hiding a button, panel, or nav link based on role *within* a page
 * that's already reachable — e.g. an "Add user" button only an admin
 * should see on a dashboard several roles share. For gating a whole
 * route, use `RequireRole` instead.
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
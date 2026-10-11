import { Navigate, Outlet } from 'react-router';

import { useAuth } from '../../context/useAuth';
import { FullScreenSpinner } from '../FullScreenSpinner';

/**
 * Inverse of RequireAuth — keeps a logged-in user off /login and
 * /register (landing there mid-session usually means a stale tab or a
 * back-button press, not intent to switch accounts).
 */
export function RequireGuest() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <FullScreenSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
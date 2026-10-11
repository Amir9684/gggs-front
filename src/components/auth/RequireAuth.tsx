import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '../../context/useAuth';
import { FullScreenSpinner } from '../FullScreenSpinner';

/**
 * Gate for any route subtree that needs a logged-in user. Unauthenticated
 * visitors are bounced to /login with the page they wanted attached as
 * `state.from`, so the login page can send them back after success.
 */
export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
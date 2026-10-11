import { createBrowserRouter } from 'react-router';

import { AppShell } from '../components/AppShell';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RequireGuest } from '../components/auth/RequireGuest';
import { RequireRole } from '../components/auth/RequireRole';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { ProjectsPage } from '../pages/projects/ProjectsPage';
import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage';
import { GridEditorPage } from '../pages/grids/GridEditorPage';
import { CalculationCaseDetailPage } from '../pages/calculations/CalculationCaseDetailPage';
import { UserRole } from '../types/user';

/**
 * Route tree, outside-in:
 *   RequireGuest   — only reachable when logged out (login/register)
 *   RequireAuth    — only reachable when logged in; also renders AppShell
 *     RequireRole  — further narrows a subtree to specific roles
 *
 * Adding a new admin-only page later is just another child under the
 * `roles: [ADMIN]` RequireRole element below — no new guard needed.
 */
export const router = createBrowserRouter([
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <ProjectsPage /> },
          { path: '/projects/:id', element: <ProjectDetailPage /> },
          {
            path: '/projects/:projectId/grids/:gridId',
            element: <GridEditorPage />,
          },
          {
            path: '/projects/:projectId/calculations/:caseId',
            element: <CalculationCaseDetailPage />,
          },
          {
            element: <RequireRole roles={[UserRole.ADMIN]} />,
            children: [{ path: '/admin/users', element: <UsersPage /> }],
          },
          { path: '/unauthorized', element: <UnauthorizedPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
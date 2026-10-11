import { ROLE_LABELS_FA, UserRole } from '../types/user';

const ROLE_STYLES: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'border-copper/40 text-copper-text',
  [UserRole.ENGINEER]: 'border-success/40 text-success',
  [UserRole.REVIEWER]: 'border-text-faint text-text-muted',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS_FA[role]}
    </span>
  );
}
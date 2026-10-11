/**
 * Mirrors `src/users/enum/index.ts` on the backend exactly. It's a plain
 * TypeScript numeric enum there (no explicit values), so the order of the
 * members below is load-bearing: ADMIN=0, ENGINEER=1, REVIEWER=2. The JWT
 * payload carries this as a number, and `/auth/me` returns it as a number
 * too — don't reorder this without changing the backend enum in lockstep.
 *
 * Written as a const object + union type rather than a TS `enum`: this
 * project has `erasableSyntaxOnly` on (tsconfig.app.json), which forbids
 * real enums since they emit runtime code.
 */
export const UserRole = {
  ADMIN: 0,
  ENGINEER: 1,
  REVIEWER: 2,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_LABELS_FA: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'ادمین',
  [UserRole.ENGINEER]: 'مهندس',
  [UserRole.REVIEWER]: 'بازدید‌کننده',
};

/** Shape returned by the backend after `sanitizeUser` strips the password hash. */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
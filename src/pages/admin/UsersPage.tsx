import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { RoleBadge } from '../../components/RoleBadge';
import { UserFormModal } from '../../components/admin/UserFormModal';
import { useAuth } from '../../context/useAuth';
import { usersApi } from '../../api/users.api';
import { ApiError, type Pagination as PaginationInfo } from '../../types/api';
import { ROLE_LABELS_FA, UserRole, type User } from '../../types/user';

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

type RoleFilter = UserRole | 'all';

export function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [usernameFilter, setUsernameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pageNumber, setPageNumber] = useState(1);

  const [formTarget, setFormTarget] = useState<'create' | User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await usersApi.getAll({
        username: usernameFilter || undefined,
        email: emailFilter || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setUsers(result.list);
      setPagination(result.pagination);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.messages[0] : 'دریافت فهرست کاربران ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, [usernameFilter, emailFilter, roleFilter, pageNumber]);

  // Debounce the two free-text filters so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Any filter change should snap back to page 1 — an active filter combined
  // with a stale page number from a larger result set would otherwise show
  // a confusing empty page.
  const handleUsernameChange = (value: string) => {
    setUsernameFilter(value);
    setPageNumber(1);
  };

  const handleEmailChange = (value: string) => {
    setEmailFilter(value);
    setPageNumber(1);
  };

  const handleRoleChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setPageNumber(1);
  };

  const handleDelete = async (target: User) => {
    try {
      await usersApi.delete(target.id);
      setDeleteTarget(null);
      // Deleting the last row on a page beyond page 1 would leave an empty
      // page — step back one page in that case instead of refetching as-is.
      if (users.length === 1 && pagination && pagination.pageNumber > 1) {
        setPageNumber((p) => p - 1);
      } else {
        fetchUsers();
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.messages[0] : 'حذف کاربر ناموفق بود.');
      throw err;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">مدیریت کاربران</h1>
          <p className="mt-1 text-sm text-text-muted">
            ایجاد، ویرایش و حذف حساب‌های کاربری سامانه.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('create')}
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover"
        >
          افزودن کاربر
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={usernameFilter}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="جستجوی نام کاربری…"
          className="w-48 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        />
        <input
          value={emailFilter}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="جستجوی ایمیل…"
          className="w-56 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        />
        <select
          value={roleFilter === 'all' ? 'all' : String(roleFilter)}
          onChange={(e) => {
            const value = e.target.value;
            handleRoleChange(value === 'all' ? 'all' : (Number(value) as UserRole));
          }}
          className="rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-text outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        >
          <option value="all">همهٔ نقش‌ها</option>
          <option value={UserRole.ADMIN}>{ROLE_LABELS_FA[UserRole.ADMIN]}</option>
          <option value={UserRole.ENGINEER}>{ROLE_LABELS_FA[UserRole.ENGINEER]}</option>
          <option value={UserRole.REVIEWER}>{ROLE_LABELS_FA[UserRole.REVIEWER]}</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border-soft bg-surface">
        {loadError && (
          <div role="alert" className="border-b border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-right text-xs text-text-faint uppercase">
              <th className="px-5 py-3 font-medium">نام کاربری</th>
              <th className="px-5 py-3 font-medium">ایمیل</th>
              <th className="px-5 py-3 font-medium">نقش</th>
              <th className="px-5 py-3 font-medium">تاریخ ایجاد</th>
              <th className="px-5 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                  در حال بارگذاری…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-text-muted">
                  کاربری با این مشخصات یافت نشد.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3 text-text">{u.username}</td>
                  <td className="px-5 py-3 text-text-muted" dir="ltr">
                    {u.email}
                  </td>
                  <td className="px-5 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs tabular text-text-muted" dir="ltr">
                    {dateFormatter.format(new Date(u.createdAt))}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormTarget(u)}
                        className="text-xs font-medium text-copper-text transition-colors hover:text-copper-hover"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id}
                        className="text-xs font-medium text-danger transition-colors hover:text-danger/80 disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === currentUser?.id ? 'امکان حذف حساب خودتان وجود ندارد.' : undefined}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination && (
          <div className="px-5 py-4">
            <Pagination pagination={pagination} onPageChange={setPageNumber} />
          </div>
        )}
      </div>

      {formTarget && (
        <UserFormModal
          user={formTarget === 'create' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            fetchUsers();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف کاربر"
          description={`آیا از حذف کاربر «${deleteTarget.username}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  );
}
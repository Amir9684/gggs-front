import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { ProjectFormModal } from '../../components/projects/ProjectFormModal';
import { projectsApi } from '../../api/projects.api';
import { ApiError, type Pagination as PaginationInfo } from '../../types/api';
import type { Project } from '../../types/project';

const PAGE_SIZE = 12;

const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [substationFilter, setSubstationFilter] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  const [formTarget, setFormTarget] = useState<'create' | Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await projectsApi.getAll({
        name: nameFilter || undefined,
        substationName: substationFilter || undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setProjects(result.list);
      setPagination(result.pagination);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.messages[0] : 'دریافت فهرست پروژه‌ها ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, [nameFilter, substationFilter, pageNumber]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 300);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleNameChange = (value: string) => {
    setNameFilter(value);
    setPageNumber(1);
  };

  const handleSubstationChange = (value: string) => {
    setSubstationFilter(value);
    setPageNumber(1);
  };

  const handleDelete = async (target: Project) => {
    try {
      await projectsApi.delete(target.id);
      setDeleteTarget(null);
      if (projects.length === 1 && pagination && pagination.pageNumber > 1) {
        setPageNumber((p) => p - 1);
      } else {
        fetchProjects();
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.messages[0] : 'حذف پروژه ناموفق بود.');
      throw err;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">پروژه‌ها</h1>
          <p className="mt-1 text-sm text-text-muted">
            طراحی و محاسبهٔ شبکه‌های زمین را از یک پروژه شروع کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('create')}
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover"
        >
          پروژهٔ جدید
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={nameFilter}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="جستجوی نام پروژه…"
          className="w-56 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        />
        <input
          value={substationFilter}
          onChange={(e) => handleSubstationChange(e.target.value)}
          placeholder="جستجوی نام پست…"
          className="w-56 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        />
      </div>

      {loadError && (
        <div role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-xl border border-border-soft bg-surface px-5 py-10 text-center text-sm text-text-muted">
            در حال بارگذاری…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border-soft bg-surface px-5 py-10 text-center text-sm text-text-muted">
            پروژه‌ای یافت نشد. برای شروع، یک پروژهٔ جدید ایجاد کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col rounded-xl border border-border-soft bg-surface p-5 transition-colors hover:border-copper/40"
              >
                <Link to={`/projects/${project.id}`} className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-text">{project.name}</h2>
                    <span className="shrink-0 rounded-full border border-copper/40 px-2.5 py-0.5 font-mono text-xs text-copper-text">
                      {project.standard}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-text-muted">
                    <dt className="text-text-faint">پست</dt>
                    <dd className="text-text">{project.substationName}</dd>
                    <dt className="text-text-faint">سطح ولتاژ</dt>
                    <dd className="font-mono tabular text-text" dir="ltr">
                      {project.voltageLevel}
                    </dd>
                  </dl>

                  {project.description && (
                    <p className="line-clamp-2 text-xs text-text-muted">{project.description}</p>
                  )}
                </Link>

                <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3">
                  <span className="font-mono text-xs tabular text-text-faint" dir="ltr">
                    {dateFormatter.format(new Date(project.createdAt))}
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormTarget(project)}
                      className="text-xs font-medium text-copper-text transition-colors hover:text-copper-hover"
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(project)}
                      className="text-xs font-medium text-danger transition-colors hover:text-danger/80"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && (
          <div className="mt-6 rounded-xl border border-border-soft bg-surface px-5 py-4">
            <Pagination pagination={pagination} onPageChange={setPageNumber} />
          </div>
        )}
      </div>

      {formTarget && (
        <ProjectFormModal
          project={formTarget === 'create' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            fetchProjects();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف پروژه"
          description={`آیا از حذف پروژهٔ «${deleteTarget.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  );
}
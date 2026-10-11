import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FullScreenSpinner } from "../../components/FullScreenSpinner";
import { ProjectFormModal } from "../../components/projects/ProjectFormModal";
import { SoilModelsSection } from "../../components/soil/SoilModelsSection";
import { GridsSection } from "../../components/grids/GridsSection";
import { CalculationCasesSection } from "../../components/calculations/CalculationCasesSection";
import { ReportsSection } from "../../components/reports/ReportsSection";
import { projectsApi } from "../../api/projects.api";
import { ApiError } from "../../types/api";
import type { Project } from "../../types/project";

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setProject(await projectsApi.getOne(id));
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت اطلاعات پروژه ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (loadError || !project) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-5 py-6 text-sm text-danger">
        {loadError ?? "پروژه یافت نشد."}
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await projectsApi.delete(project.id);
      navigate("/", { replace: true });
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "حذف پروژه ناموفق بود."
      );
      throw err;
    }
  };

  return (
    <div>
      <Link
        to="/"
        className="text-xs font-medium text-text-muted transition-colors hover:text-copper-text"
      >
        ← بازگشت به پروژه‌ها
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text">{project.name}</h1>
            <span className="rounded-full border border-copper/40 px-2.5 py-0.5 font-mono text-xs text-copper-text">
              {project.standard}
            </span>
          </div>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
          >
            ویرایش
          </button>
          <button
            type="button"
            onClick={() => setIsDeleting(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            حذف پروژه
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-border-soft bg-surface p-5 sm:grid-cols-3">
        <div className="flex items-center gap-1.5">
          <dt className="font-mono text-xs tracking-widest text-text-faint uppercase">
            پست:
          </dt>
          <dd className="mt-1 text-sm text-text">{project.substationName}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="font-mono text-xs tracking-widest text-text-faint uppercase">
            سطح ولتاژ:
          </dt>
          <dd className="mt-1 font-mono text-sm tabular text-text">
            {project.voltageLevel}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="font-mono text-xs tracking-widest text-text-faint uppercase">
            تاریخ ایجاد:
          </dt>
          <dd className="mt-1 font-mono text-sm tabular text-text">
            {dateFormatter.format(new Date(project.createdAt))}
          </dd>
        </div>
      </dl>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SoilModelsSection projectId={project.id} />
        <GridsSection projectId={project.id} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CalculationCasesSection projectId={project.id} />
        <ReportsSection projectId={project.id} />
      </div>

      {isEditing && (
        <ProjectFormModal
          project={project}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            fetchProject();
          }}
        />
      )}

      {isDeleting && (
        <ConfirmDialog
          title="حذف پروژه"
          description={`آیا از حذف پروژهٔ «${project.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setIsDeleting(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
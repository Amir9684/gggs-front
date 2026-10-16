import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { ConfirmDialog } from "../ConfirmDialog";
import { gridsApi } from "../../api/grids.api";
import { ApiError } from "../../types/api";
import type { Grid } from "../../types/grid";
import { GridFormModal } from "./GridFormModal";
import { LegacyImportModal } from "./LegacyImportModal";

interface GridsSectionProps {
  projectId: string;
}

export function GridsSection({ projectId }: GridsSectionProps) {
  const [grids, setGrids] = useState<Grid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingGrid, setEditingGrid] = useState<Grid | null>(null);
  const [deletingGrid, setDeletingGrid] = useState<Grid | null>(null);

  const fetchGrids = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await gridsApi.getAll({ projectId, pageSize: 100 });
      setGrids(result.list);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "دریافت شبکه‌ها ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGrids();
  }, [fetchGrids]);

  const handleDelete = async () => {
    if (!deletingGrid) return;
    try {
      await gridsApi.delete(deletingGrid.id);
      setDeletingGrid(null);
      fetchGrids();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "حذف شبکه ناموفق بود."
      );
      throw err;
    }
  };

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">شبکه‌های زمین</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            ابعاد و عمق دفن شبکهٔ ارت؛ هادی‌ها و میله‌ها را در طراح تعاملی رسم کنید.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsImporting(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
          >
            ورود از فایل ویندوز
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
          >
            + شبکهٔ جدید
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-text-faint">در حال بارگذاری…</p>
      ) : loadError ? (
        <p className="mt-4 text-xs text-danger">{loadError}</p>
      ) : grids.length === 0 ? (
        <p className="mt-4 text-xs text-text-faint">
          هنوز شبکه‌ای برای این پروژه ثبت نشده است.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {grids.map((grid) => (
            <div
              key={grid.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-text">
                  {grid.name}
                </span>
                <p
                  className="mt-1 font-mono text-xs tabular text-text-muted"
                  dir="ltr"
                >
                  {grid.length} × {grid.width} m · عمق {grid.burialDepth} m
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/projects/${projectId}/grids/${grid.id}`}
                  className="rounded-md border border-copper/50 px-3 py-1.5 text-xs font-medium text-copper-text transition-colors hover:bg-copper/10"
                >
                  طراحی شبکه
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingGrid(grid)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingGrid(grid)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreating && (
        <GridFormModal
          projectId={projectId}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            setIsCreating(false);
            fetchGrids();
          }}
        />
      )}

      {isImporting && (
        <LegacyImportModal
          projectId={projectId}
          onClose={() => setIsImporting(false)}
          onImported={(grid) => {
            setIsImporting(false);
            fetchGrids();
            // Open the new grid so the import can be checked right away.
            navigate(`/projects/${projectId}/grids/${grid.id}`);
          }}
        />
      )}

      {editingGrid && (
        <GridFormModal
          projectId={projectId}
          grid={editingGrid}
          onClose={() => setEditingGrid(null)}
          onSaved={() => {
            setEditingGrid(null);
            fetchGrids();
          }}
        />
      )}

      {deletingGrid && (
        <ConfirmDialog
          title="حذف شبکه"
          description={`آیا از حذف شبکهٔ «${deletingGrid.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setDeletingGrid(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

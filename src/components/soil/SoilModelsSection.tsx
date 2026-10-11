import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "../ConfirmDialog";
import { soilModelsApi } from "../../api/soil.api";
import { ApiError } from "../../types/api";
import type { SoilModel } from "../../types/soil";
import { SoilModelFormModal } from "./SoilModelFormModal";
import toast from "react-hot-toast";

interface SoilModelsSectionProps {
  projectId: string;
}

export function SoilModelsSection({ projectId }: SoilModelsSectionProps) {
  const [soilModels, setSoilModels] = useState<SoilModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingModel, setEditingModel] = useState<SoilModel | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<SoilModel | null>(null);

  const fetchSoilModels = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await soilModelsApi.getAll({ projectId, pageSize: 100 });
      setSoilModels(result.list);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت مدل‌های خاک ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSoilModels();
  }, [fetchSoilModels]);

  // `getAll` doesn't join `layers` (only `getOne` does), so the edit form
  // needs a fresh single-model fetch before it can prefill the layer rows —
  // the list row's `soilModel` isn't enough on its own.
  const handleEditClick = async (soilModel: SoilModel) => {
    setLoadingEditId(soilModel.id);
    setLoadError(null);
    try {
      const full = await soilModelsApi.getOne(soilModel.id);
      setEditingModel(full);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت اطلاعات مدل خاک ناموفق بود."
      );
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingModel) return;
    try {
      await soilModelsApi.delete(deletingModel.id);
      setDeletingModel(null);
      fetchSoilModels();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.messages[0] : "حذف مدل خاک ناموفق بود."
      );

      throw err;
    }
  };

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">مدل‌های خاک</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            مقاومت ویژهٔ لایهٔ سطحی و لایه‌بندی خاک زیر شبکه.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
        >
          + مدل خاک جدید
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-text-faint">در حال بارگذاری…</p>
      ) : loadError ? (
        <p className="mt-4 text-xs text-danger">{loadError}</p>
      ) : soilModels.length === 0 ? (
        <p className="mt-4 text-xs text-text-faint">
          هنوز مدل خاکی برای این پروژه ثبت نشده است.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {soilModels.map((soilModel) => (
            <div
              key={soilModel.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-text">
                  {soilModel.name}
                </span>
                <p
                  className="mt-1 font-mono text-xs tabular text-text-muted"
                  dir="ltr"
                >
                  ρs = {soilModel.surfaceResistivity} Ω·m
                  {soilModel.layers &&
                    ` · ${
                      soilModel.layers.length === 1
                        ? "1 layer"
                        : `${soilModel.layers.length} layers`
                    }`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEditClick(soilModel)}
                  disabled={loadingEditId === soilModel.id}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingEditId === soilModel.id ? "…" : "ویرایش"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingModel(soilModel)}
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
        <SoilModelFormModal
          projectId={projectId}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            setIsCreating(false);
            fetchSoilModels();
          }}
        />
      )}

      {editingModel && (
        <SoilModelFormModal
          projectId={projectId}
          soilModel={editingModel}
          onClose={() => setEditingModel(null)}
          onSaved={() => {
            setEditingModel(null);
            fetchSoilModels();
          }}
        />
      )}

      {deletingModel && (
        <ConfirmDialog
          title="حذف مدل خاک"
          description={`آیا از حذف مدل خاک «${deletingModel.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
          onCancel={() => setDeletingModel(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { ConfirmDialog } from "../ConfirmDialog";
import { calculationCasesApi } from "../../api/calculations.api";
import { ApiError } from "../../types/api";
import type { CalculationCase } from "../../types/calculation";
import { CalculationCaseFormModal } from "./CalculationCaseFormModal";

interface CalculationCasesSectionProps {
  projectId: string;
}

export function CalculationCasesSection({
  projectId,
}: CalculationCasesSectionProps) {
  const [cases, setCases] = useState<CalculationCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCase, setDeletingCase] = useState<CalculationCase | null>(
    null
  );

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await calculationCasesApi.getAll({
        projectId,
        pageSize: 100,
      });
      setCases(result.list);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت کیس‌های محاسباتی ناموفق بود."
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleDelete = async () => {
    if (!deletingCase) return;
    try {
      await calculationCasesApi.delete(deletingCase.id);
      setDeletingCase(null);
      fetchCases();
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "حذف کیس محاسباتی ناموفق بود."
      );
      throw err;
    }
  };

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">کیس‌های محاسباتی</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            مقاومت شبکه، GPR، ولتاژ گام و تماس، و ارزیابی ایمنی طبق IEEE 80.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
        >
          + کیس محاسباتی جدید
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-text-faint">در حال بارگذاری…</p>
      ) : loadError ? (
        <p className="mt-4 text-xs text-danger">{loadError}</p>
      ) : cases.length === 0 ? (
        <p className="mt-4 text-xs text-text-faint">
          هنوز کیس محاسباتی‌ای برای این پروژه ثبت نشده است.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {cases.map((calculationCase) => (
            <div
              key={calculationCase.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-text">
                  {calculationCase.name}
                </span>
                <p className="mt-1 text-xs text-text-muted">
                  {calculationCase.grid?.name ?? "—"} ·{" "}
                  {calculationCase.soilModel?.name ?? "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/projects/${projectId}/calculations/${calculationCase.id}`}
                  className="rounded-md border border-copper/50 px-3 py-1.5 text-xs font-medium text-copper-text transition-colors hover:bg-copper/10"
                >
                  محاسبه و نتایج
                </Link>
                <button
                  type="button"
                  onClick={() => setDeletingCase(calculationCase)}
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
        <CalculationCaseFormModal
          projectId={projectId}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            setIsCreating(false);
            fetchCases();
          }}
        />
      )}

      {deletingCase && (
        <ConfirmDialog
          title="حذف کیس محاسباتی"
          description={`آیا از حذف کیس محاسباتی «${deletingCase.name}» مطمئن هستید؟ نتایج و گزارش‌های وابسته نیز حذف می‌شوند.`}
          onCancel={() => setDeletingCase(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
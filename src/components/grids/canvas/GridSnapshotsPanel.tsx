import { useCallback, useEffect, useState } from "react";

import { gridSnapshotsApi, type GridSnapshot } from "../../../api/grid-elements.api";
import { ApiError } from "../../../types/api";
import type { GridElement } from "../../../types/grid";

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
  dateStyle: "short",
  timeStyle: "short",
});

interface GridSnapshotsPanelProps {
  gridId: string;
  /** True while the canvas has unsaved local edits — snapshots are taken from the server's saved state, so they're disabled until a save happens. */
  hasUnsavedChanges: boolean;
  readOnly: boolean;
  onRestored: (elements: GridElement[]) => void;
}

export function GridSnapshotsPanel({
  gridId,
  hasUnsavedChanges,
  readOnly,
  onRestored,
}: GridSnapshotsPanelProps) {
  const [snapshots, setSnapshots] = useState<GridSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gridSnapshotsApi.getAll(gridId);
      setSnapshots(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.messages[0] : "دریافت نسخه‌ها ناموفق بود.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [gridId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreateSnapshot = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await gridSnapshotsApi.create(gridId);
      await fetchSnapshots();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.messages[0] : "ذخیرهٔ نسخه ناموفق بود.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    setError(null);
    try {
      const elements = await gridSnapshotsApi.restore(id);
      onRestored(elements);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.messages[0] : "بازگردانی نسخه ناموفق بود.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">تاریخچهٔ نسخه‌ها</h3>
        {!readOnly && (
          <button
            type="button"
            title={
              hasUnsavedChanges
                ? "ابتدا تغییرات را ذخیره کنید"
                : "ذخیرهٔ نسخهٔ جدید از وضعیت فعلی"
            }
            disabled={hasUnsavedChanges || isSaving}
            onClick={handleCreateSnapshot}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-copper hover:text-copper-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "در حال ذخیره…" : "+ ذخیرهٔ نسخه"}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {isLoading ? (
        <p className="mt-3 text-xs text-text-faint">در حال بارگذاری…</p>
      ) : snapshots.length === 0 ? (
        <p className="mt-3 text-xs text-text-faint">هنوز نسخه‌ای ذخیره نشده است.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2"
            >
              <div>
                <span className="font-mono text-xs tabular text-text">
                  نسخهٔ {snapshot.version}
                </span>
                <p className="mt-0.5 font-mono text-[10px] tabular text-text-faint" dir="ltr">
                  {dateTimeFormatter.format(new Date(snapshot.createdAt))}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  disabled={restoringId === snapshot.id}
                  onClick={() => handleRestore(snapshot.id)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:border-copper hover:text-copper-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoringId === snapshot.id ? "…" : "بازگردانی"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
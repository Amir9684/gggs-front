import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";

import { FullScreenSpinner } from "../../components/FullScreenSpinner";
import { GridCanvas } from "../../components/grids/canvas/GridCanvas";
import { gridsApi } from "../../api/grids.api";
import { ApiError } from "../../types/api";
import type { Grid } from "../../types/grid";
import { useAuth } from "../../context/useAuth";
import { UserRole } from "../../types/user";

export function GridEditorPage() {
  const { projectId, gridId } = useParams<{
    projectId: string;
    gridId: string;
  }>();
  const { user } = useAuth();

  const [grid, setGrid] = useState<Grid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchGrid = useCallback(async () => {
    if (!gridId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setGrid(await gridsApi.getOne(gridId));
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.messages[0] : "دریافت شبکه ناموفق بود.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [gridId]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  if (!projectId || !gridId) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (loadError || !grid) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-5 py-6 text-sm text-danger">
        {loadError ?? "شبکه یافت نشد."}
      </div>
    );
  }

  // Reviewers can inspect a grid's layout but not draw, move, delete, or save it.
  const readOnly = user?.role === UserRole.REVIEWER;

  return (
    <div>
      <Link
        to={`/projects/${projectId}`}
        className="text-xs font-medium text-text-muted transition-colors hover:text-copper-text"
      >
        ← بازگشت به پروژه
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">{grid.name}</h1>
          <p className="mt-1 font-mono text-xs tabular text-text-muted" dir="ltr">
            {grid.length} × {grid.width} m · عمق دفن {grid.burialDepth} m
          </p>
        </div>
      </div>

      <div className="mt-6">
        <GridCanvas grid={grid} readOnly={readOnly} onGridChange={setGrid} />
      </div>
    </div>
  );
}

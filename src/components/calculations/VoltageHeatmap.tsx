import { useMemo, useState } from "react";
import type { SamplePoint } from "../../types/calculation";
import { voltageColorFor, voltageExtent } from "../../lib/voltage-color";

interface VoltageHeatmapProps {
  title: string;
  unit?: string;
  points: SamplePoint[];
  /**
   * Shown only when the map contains negative values. Should name the
   * geometric factor responsible for this particular map (Ks for step
   * voltage, Km for touch/mesh voltage) — see `voltage-color.ts` for why
   * negative samples are possible at all.
   */
  negativeValueHint?: string;
}

/**
 * `sampleSurfacePotential` on the backend emits an NxN grid, but the point
 * list itself carries no row/column indices — this reconstructs the 2D
 * layout from the distinct x/y coordinates present in the data so the
 * component works regardless of the engine's sampling resolution.
 */
function buildMatrix(points: SamplePoint[]) {
  const xs = Array.from(new Set(points.map((p) => p.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(points.map((p) => p.y))).sort((a, b) => a - b);
  const lookup = new Map(points.map((p) => [`${p.x}:${p.y}`, p.value]));
  // Top row = far edge (max y), so the grid reads like a plan view.
  const displayYs = [...ys].reverse();
  const rows = displayYs.map((y) =>
    xs.map((x) => lookup.get(`${x}:${y}`) ?? null)
  );
  return { xs, displayYs, rows };
}

export function VoltageHeatmap({
  title,
  unit = "V",
  points,
  negativeValueHint = "افت ضریب هندسی مربوطه در این هندسهٔ شبکه",
}: VoltageHeatmapProps) {
  const [hovered, setHovered] = useState<{
    x: number;
    y: number;
    value: number;
  } | null>(null);

  const { xs, displayYs, rows, minValue, maxValue, maxAbsValue, hasNegative } =
    useMemo(() => {
      const { xs, displayYs, rows } = buildMatrix(points);
      const { minValue, maxValue, maxAbsValue, hasNegative } =
        voltageExtent(points);
      return {
        xs,
        displayYs,
        rows,
        minValue,
        maxValue,
        maxAbsValue,
        hasNegative,
      };
    }, [points]);

  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-border-soft bg-surface-2 p-4">
        <h4 className="text-xs font-bold text-text">{title}</h4>
        <p className="mt-2 text-xs text-text-faint">
          داده‌ای برای نمایش وجود ندارد.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text">{title}</h4>
        <span className="font-mono text-xs tabular text-text-faint" dir="ltr">
          {hasNegative
            ? `${minValue.toFixed(1)} … ${maxValue.toFixed(1)}`
            : `max ${maxValue.toFixed(1)}`}{" "}
          {unit}
        </span>
      </div>

      {hasNegative && (
        <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
          این نقشه شامل مقادیر منفی است (رنگ بنفش) — از نظر فیزیکی نامعتبر،
          معمولاً ناشی از {negativeValueHint}.
        </p>
      )}

      <div
        className="mt-3 grid gap-px overflow-hidden rounded-md border border-border-soft bg-border-soft"
        style={{ gridTemplateColumns: `repeat(${xs.length}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered(null)}
      >
        {rows.map((row, ri) =>
          row.map((value, ci) => (
            <div
              key={`${ri}-${ci}`}
              onMouseEnter={() =>
                value !== null &&
                setHovered({ x: xs[ci], y: displayYs[ri], value })
              }
              title={value !== null ? `${value.toFixed(2)} ${unit}` : undefined}
              className="aspect-square"
              style={{
                backgroundColor:
                  value === null || maxAbsValue === 0
                    ? "var(--color-surface-2)"
                    : voltageColorFor(value / maxAbsValue),
              }}
            />
          ))
        )}
      </div>

      <p className="mt-2 font-mono text-xs tabular text-text-faint" dir="ltr">
        {hovered
          ? `x=${hovered.x.toFixed(1)}  y=${hovered.y.toFixed(
              1
            )}  value=${hovered.value.toFixed(2)} ${unit}`
          : "برای مشاهدهٔ مقدار هر نقطه، اشاره‌گر را روی نقشه نگه دارید."}
      </p>
    </div>
  );
}

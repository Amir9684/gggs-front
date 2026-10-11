import { useMemo, useState } from "react";
import type { VoltageProfilePoint } from "../../types/calculation";

interface VoltageProfileChartProps {
  points: VoltageProfilePoint[];
  unit?: string;
}

const WIDTH = 480;
const HEIGHT = 160;
const PAD_LEFT = 44;
const PAD_BOTTOM = 20;
const PAD_TOP = 12;
const PAD_RIGHT = 12;

/**
 * `sampleSurfacePotential` (backend) walks a diagonal transect from (0,0)
 * to (gridLength, gridWidth) — this chart plots voltage against distance
 * travelled along that diagonal, since the raw x/y pairs alone don't read
 * as a profile the way a 2D grid does.
 */
export function VoltageProfileChart({ points, unit = "V" }: VoltageProfileChartProps) {
  const { path, areaPath, maxValue, distances } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", areaPath: "", maxValue: 0, distances: [] as number[] };
    }
    const origin = points[0];
    const distances = points.map((p) =>
      Math.hypot(p.x - origin.x, p.y - origin.y),
    );
    const maxDistance = distances[distances.length - 1] || 1;
    const maxValue = Math.max(...points.map((p) => p.voltage), 0);

    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const coords = points.map((p, i) => {
      const px = PAD_LEFT + (distances[i] / maxDistance) * plotWidth;
      const py =
        PAD_TOP + plotHeight - (maxValue > 0 ? (p.voltage / maxValue) * plotHeight : 0);
      return [px, py] as const;
    });

    const path = coords
      .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(" ");
    const areaPath =
      `${path} L ${(PAD_LEFT + plotWidth).toFixed(1)} ${(PAD_TOP + plotHeight).toFixed(1)} ` +
      `L ${PAD_LEFT.toFixed(1)} ${(PAD_TOP + plotHeight).toFixed(1)} Z`;

    return { path, areaPath, maxValue, distances };
  }, [points]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-border-soft bg-surface-2 p-4">
        <h4 className="text-xs font-bold text-text">پروفیل ولتاژ سطح (مقطع قطری)</h4>
        <p className="mt-2 text-xs text-text-faint">داده‌ای برای نمایش وجود ندارد.</p>
      </div>
    );
  }

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text">پروفیل ولتاژ سطح (مقطع قطری)</h4>
        <span className="font-mono text-xs tabular text-text-faint" dir="ltr">
          max {maxValue.toFixed(1)} {unit}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--color-border-soft)"
        />
        <line
          x1={PAD_LEFT}
          y1={HEIGHT - PAD_BOTTOM}
          x2={WIDTH - PAD_RIGHT}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--color-border-soft)"
        />

        <path d={areaPath} fill="var(--color-copper)" fillOpacity={0.12} stroke="none" />
        <path d={path} fill="none" stroke="var(--color-copper)" strokeWidth={1.5} />

        {points.map((p, i) => {
          const px =
            PAD_LEFT + (distances[i] / (distances[distances.length - 1] || 1)) * plotWidth;
          const py =
            PAD_TOP +
            (HEIGHT - PAD_TOP - PAD_BOTTOM) -
            (maxValue > 0 ? (p.voltage / maxValue) * (HEIGHT - PAD_TOP - PAD_BOTTOM) : 0);
          return (
            <circle
              key={p.id}
              cx={px}
              cy={py}
              r={hoverIndex === i ? 3 : 0}
              fill="var(--color-copper)"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
        {/* Wide invisible hit targets so hover works without needing pixel-perfect aim on the small dots. */}
        {points.map((p, i) => {
          const px =
            PAD_LEFT + (distances[i] / (distances[distances.length - 1] || 1)) * plotWidth;
          return (
            <rect
              key={`hit-${p.id}`}
              x={px - plotWidth / points.length / 2}
              y={PAD_TOP}
              width={plotWidth / points.length}
              height={HEIGHT - PAD_TOP - PAD_BOTTOM}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      <p className="mt-1 font-mono text-xs tabular text-text-faint" dir="ltr">
        {hovered
          ? `d = ${distances[hoverIndex!].toFixed(1)} m → ${hovered.voltage.toFixed(1)} ${unit}`
          : "مقطع از (۰,۰) تا گوشهٔ مقابل شبکه"}
      </p>
    </div>
  );
}

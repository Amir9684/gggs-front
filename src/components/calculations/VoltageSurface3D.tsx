// src/components/calculations/VoltageSurface3D.tsx
import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { SamplePoint } from "../../types/calculation";
import {
  voltageColorFor,
  voltageExtent,
  positiveMax,
} from "../../lib/voltage-color";

interface VoltageSurface3DProps {
  title: string;
  unit?: string;
  points: SamplePoint[];
  /** Same purpose as `VoltageHeatmap`'s prop of the same name. */
  negativeValueHint?: string;
}

const VIEW_SIZE = 320;
const PLAN_SIZE = 220;
/** Tallest peak reaches this fraction of the plan's width — reads like terrain relief, not a spike chart. */
const HEIGHT_FRACTION = 0.42;

const MIN_ELEVATION = (10 * Math.PI) / 180;
const MAX_ELEVATION = (80 * Math.PI) / 180;
const DEFAULT_AZIMUTH = (-35 * Math.PI) / 180;
const DEFAULT_ELEVATION = (32 * Math.PI) / 180;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Simple two-angle orthographic projection (rotate around the height axis,
 * then tilt to reveal it) — the same trick classic hand-rolled "fake 3D"
 * terrain/bar charts use. Not a true perspective camera, but it reads as
 * 3D and needs no rendering library. `depth` is only for the painter's
 * algorithm below, it isn't drawn.
 */
function project(v: Vec3, azimuth: number, elevation: number) {
  const rx = v.x * Math.cos(azimuth) - v.y * Math.sin(azimuth);
  const ry = v.x * Math.sin(azimuth) + v.y * Math.cos(azimuth);
  const screenX = rx;
  const screenY = ry * Math.sin(elevation) - v.z * Math.cos(elevation);
  const depth = ry * Math.cos(elevation) + v.z * Math.sin(elevation);
  return { screenX, screenY, depth };
}

/** Same reconstruction approach as `VoltageHeatmap.buildMatrix`, kept local since the indexing needs differ (no row-reversal here — the projection handles orientation). */
function buildGrid(points: SamplePoint[]) {
  const xs = Array.from(new Set(points.map((p) => p.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(points.map((p) => p.y))).sort((a, b) => a - b);
  const lookup = new Map(points.map((p) => [`${p.x}:${p.y}`, p.value]));
  const matrix = ys.map((y) => xs.map((x) => lookup.get(`${x}:${y}`) ?? null));
  return { xs, ys, matrix };
}

export function VoltageSurface3D({
  title,
  unit = "V",
  points,
  negativeValueHint = "افت ضریب هندسی مربوطه در این هندسهٔ شبکه",
}: VoltageSurface3DProps) {
  const [azimuth, setAzimuth] = useState(DEFAULT_AZIMUTH);
  const [elevation, setElevation] = useState(DEFAULT_ELEVATION);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startAzimuth: number;
    startElevation: number;
  } | null>(null);

  const {
    xs,
    ys,
    matrix,
    minValue,
    maxValue,
    maxAbsValue,
    hasNegative,
    heightScaleMax,
  } = useMemo(() => {
    const { xs, ys, matrix } = buildGrid(points);
    const { minValue, maxValue, maxAbsValue, hasNegative } =
      voltageExtent(points);
    // Deliberately separate from `maxAbsValue`: this is what sizes the
    // mesh's vertical scale, and must ignore negative samples entirely
    // so they can't compress or invert the surrounding terrain — see the
    // comment on `zScale` below for why that matters.
    const heightScaleMax = positiveMax(points);
    return {
      xs,
      ys,
      matrix,
      minValue,
      maxValue,
      maxAbsValue,
      hasNegative,
      heightScaleMax,
    };
  }, [points]);

  const quads = useMemo(() => {
    if (xs.length < 2 || ys.length < 2 || maxAbsValue === 0) return [];

    const xMin = xs[0];
    const xMax = xs[xs.length - 1];
    const yMin = ys[0];
    const yMax = ys[ys.length - 1];
    const xSpan = xMax - xMin || 1;
    const ySpan = yMax - yMin || 1;

    /**
     * Scaled by the largest *non-negative* sample only. `sampleSurfacePotential`
     * on the backend produces each map as a single scalar (Em or Es) times a
     * per-point factor in [0, 1] — so if that scalar itself is negative (see
     * `voltage-color.ts`'s module doc), every sample in the map flips sign
     * together, with the value closest to zero landing at the grid center and
     * the most negative value at the perimeter. Scaling height by that would
     * turn the intended "low at center, rising toward the edge" shape into its
     * exact opposite: a peak at the center, sinking toward the edges — an
     * upside-down pyramid sitting below the zero-plane. Sizing (and clamping,
     * below) by the positive samples only keeps the mesh's shape tied to the
     * physically meaningful values, regardless of what a stray negative
     * scalar does elsewhere in the map.
     */
    const zScale =
      heightScaleMax > 0 ? (PLAN_SIZE * HEIGHT_FRACTION) / heightScaleMax : 0;

    const rawValueAt = (xi: number, yi: number): number | null => {
      const value = matrix[yi]?.[xi];
      return value === null || value === undefined ? null : value;
    };

    const toVec3 = (xi: number, yi: number): Vec3 | null => {
      const value = rawValueAt(xi, yi);
      if (value === null) return null;
      return {
        x: ((xs[xi] - xMin) / xSpan) * PLAN_SIZE - PLAN_SIZE / 2,
        y: ((ys[yi] - yMin) / ySpan) * PLAN_SIZE - PLAN_SIZE / 2,
        // Clamp to 0: a negative sample sits flush with the zero plane
        // instead of dipping the surface — it's shown (via color, below),
        // just not allowed to shape the terrain.
        z: Math.max(value, 0) * zScale,
      };
    };

    const cells: { screenPoints: string; color: string; depth: number }[] = [];

    for (let yi = 0; yi < ys.length - 1; yi++) {
      for (let xi = 0; xi < xs.length - 1; xi++) {
        const corners = [
          toVec3(xi, yi),
          toVec3(xi + 1, yi),
          toVec3(xi + 1, yi + 1),
          toVec3(xi, yi + 1),
        ];
        if (corners.some((c) => c === null)) continue;
        const vecs = corners as Vec3[];

        // Raw (unclamped) values, used only for color — this is what lets a
        // negative cell still read as violet even though its geometry was
        // pinned flat above.
        const rawCorners = [
          rawValueAt(xi, yi),
          rawValueAt(xi + 1, yi),
          rawValueAt(xi + 1, yi + 1),
          rawValueAt(xi, yi + 1),
        ] as number[];
        const avgRawValue = rawCorners.reduce((sum, v) => sum + v, 0) / 4;

        const projected = vecs.map((v) => project(v, azimuth, elevation));
        const avgDepth = projected.reduce((sum, p) => sum + p.depth, 0) / 4;

        const screenPoints = projected
          .map(
            (p) =>
              `${(VIEW_SIZE / 2 + p.screenX).toFixed(1)},${(
                VIEW_SIZE / 2 +
                p.screenY
              ).toFixed(1)}`
          )
          .join(" ");

        cells.push({
          screenPoints,
          color: voltageColorFor(avgRawValue / maxAbsValue),
          depth: avgDepth,
        });
      }
    }

    // Painter's algorithm: draw the furthest quads first so nearer ones
    // (correctly) occlude them — no z-buffer needed for a heightfield mesh.
    cells.sort((a, b) => a.depth - b.depth);
    return cells;
  }, [xs, ys, matrix, maxAbsValue, heightScaleMax, azimuth, elevation]);

  /** Dashed z=0 reference frame, only drawn when the surface contains negative (now flattened) samples — otherwise the "ground" is implicitly the lowest point and doesn't need calling out. */
  const zeroPlane = useMemo(() => {
    if (!hasNegative) return null;
    const corners: Vec3[] = [
      { x: -PLAN_SIZE / 2, y: -PLAN_SIZE / 2, z: 0 },
      { x: PLAN_SIZE / 2, y: -PLAN_SIZE / 2, z: 0 },
      { x: PLAN_SIZE / 2, y: PLAN_SIZE / 2, z: 0 },
      { x: -PLAN_SIZE / 2, y: PLAN_SIZE / 2, z: 0 },
    ];
    return corners
      .map((v) => project(v, azimuth, elevation))
      .map(
        (p) =>
          `${(VIEW_SIZE / 2 + p.screenX).toFixed(1)},${(
            VIEW_SIZE / 2 +
            p.screenY
          ).toFixed(1)}`
      )
      .join(" ");
  }, [hasNegative, azimuth, elevation]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAzimuth: azimuth,
      startElevation: elevation,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setAzimuth(drag.startAzimuth + (dx / VIEW_SIZE) * Math.PI);
    setElevation(
      Math.min(
        MAX_ELEVATION,
        Math.max(
          MIN_ELEVATION,
          drag.startElevation - (dy / VIEW_SIZE) * Math.PI
        )
      )
    );
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragState.current?.pointerId === event.pointerId)
      dragState.current = null;
  };

  const resetView = () => {
    setAzimuth(DEFAULT_AZIMUTH);
    setElevation(DEFAULT_ELEVATION);
  };

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
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular text-text-faint" dir="ltr">
            {hasNegative
              ? `${minValue.toFixed(1)} … ${maxValue.toFixed(1)}`
              : `max ${maxValue.toFixed(1)}`}{" "}
            {unit}
          </span>
          <button
            type="button"
            onClick={resetView}
            className="text-xs text-copper-text underline decoration-dotted underline-offset-2 hover:text-copper"
          >
            بازنشانی نما
          </button>
        </div>
      </div>

      {hasNegative && (
        <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
          این سطح شامل مقادیر منفی است (رنگ بنفش، تخت‌شده روی صفحهٔ خط‌چین) — از
          نظر فیزیکی نامعتبر، معمولاً ناشی از {negativeValueHint}. این مقادیر در
          شکل‌دهی به سطح لحاظ نشده‌اند.
        </p>
      )}

      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="mt-3 w-full cursor-grab touch-none rounded-md border border-border-soft bg-surface active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {zeroPlane && (
          <polygon
            points={zeroPlane}
            fill="none"
            stroke="var(--color-border-soft)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {quads.map((quad, i) => (
          <polygon
            key={i}
            points={quad.screenPoints}
            fill={quad.color}
            stroke="var(--color-surface-2)"
            strokeWidth={0.5}
          />
        ))}
      </svg>

      <p className="mt-2 text-xs text-text-faint">
        برای چرخاندن نما بکشید (drag) — این یک تقریب بصری از سطح ولتاژ است، نه
        حل میدانی دقیق.
      </p>
    </div>
  );
}

// src/lib/voltage-color.ts
/**
 * Low → high interpolation, success green through copper to danger red.
 * Shared by `VoltageHeatmap` and `VoltageSurface3D` so both views agree.
 *
 * `sampleSurfacePotential`'s maps are `stepVoltage * perimeterProximity`
 * (proximity is always >= 0), so a negative sample means the underlying
 * worst-case Es was negative. That happens when Ks (`stepGeometricFactor`,
 * IEEE 80-2013 Eq. 65) picks up a negative `(1/D)(1 - 0.5^(n-2))` term for
 * grids whose effective parallel-conductor count `n` drops below 2 (sparse
 * grids, or unusual spacing-to-depth ratios). It's a real output of the
 * current formula for those geometries, not a random glitch — so the scale
 * needs to represent it rather than clip it into the "safe" green end.
 *
 * `t` is normalized to [-1, 1] by the caller (value / max(|min|, |max|)).
 */
const LOW_COLOR = [79, 174, 122]; // success green
const MID_COLOR = [201, 122, 69]; // copper
const HIGH_COLOR = [229, 72, 77]; // danger red
const NEGATIVE_COLOR = [124, 58, 237]; // violet — flags non-physical negative values
const ZERO_COLOR = [156, 163, 175]; // neutral gray at t = 0

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(from: number[], to: number[], t: number): string {
  const r = Math.round(lerp(from[0], to[0], t));
  const g = Math.round(lerp(from[1], to[1], t));
  const b = Math.round(lerp(from[2], to[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * `t` in [-1, 1] → an `rgb(...)` string. Negative `t` ramps toward violet
 * instead of being clamped into the positive scale, so a negative cell is
 * visibly distinct from "low but valid".
 */
export function voltageColorFor(t: number): string {
  const clamped = Math.min(1, Math.max(-1, t));

  if (clamped < 0) {
    return mix(ZERO_COLOR, NEGATIVE_COLOR, -clamped);
  }

  const [from, to, localT] =
    clamped < 0.5
      ? [LOW_COLOR, MID_COLOR, clamped / 0.5]
      : [MID_COLOR, HIGH_COLOR, (clamped - 0.5) / 0.5];
  return mix(from, to, localT);
}

export interface VoltageExtent {
  minValue: number;
  maxValue: number;
  /** max(|min|, |max|) — used to normalize both positive and negative values onto a shared [-1, 1] scale. */
  maxAbsValue: number;
  hasNegative: boolean;
}

/** Extent of a sample set. Returns a zero extent for an empty list so callers don't need a separate empty-check just for this. */
export function voltageExtent(points: { value: number }[]): VoltageExtent {
  if (points.length === 0) {
    return { minValue: 0, maxValue: 0, maxAbsValue: 0, hasNegative: false };
  }
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const p of points) {
    if (p.value < minValue) minValue = p.value;
    if (p.value > maxValue) maxValue = p.value;
  }
  return {
    minValue,
    maxValue,
    maxAbsValue: Math.max(Math.abs(minValue), Math.abs(maxValue)),
    hasNegative: minValue < 0,
  };
}

/**
 * Largest non-negative sample, or 0 if every sample is negative. Used to
 * size `VoltageSurface3D`'s vertical scale from *only* the physically
 * meaningful values — see that component for why a negative sample must
 * not participate in sizing or shaping the mesh.
 */
export function positiveMax(points: { value: number }[]): number {
  let max = 0;
  for (const p of points) {
    if (p.value > max) max = p.value;
  }
  return max;
}

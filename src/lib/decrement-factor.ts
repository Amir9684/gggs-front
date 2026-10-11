/**
 * Mirrors `src/calculations/engine/decrement-factor.engine.ts` on the
 * backend. Used only to PREVIEW the Df the backend will derive when the
 * user leaves the decrement-factor field empty — the backend stays the
 * source of truth. Keep the two tables in sync.
 *
 *   0.008 s -> 1.65,  0.1 s -> 1.25,  0.25 s -> 1.1,  0.5 s or more -> 1.0
 *
 * Durations in between are rounded DOWN to the next listed duration
 * (higher, more conservative Df).
 */
const DECREMENT_FACTOR_TABLE: ReadonlyArray<{
  fromSeconds: number;
  factor: number;
}> = [
  { fromSeconds: 0.5, factor: 1.0 },
  { fromSeconds: 0.25, factor: 1.1 },
  { fromSeconds: 0.1, factor: 1.25 },
  { fromSeconds: 0, factor: 1.65 },
];

/** Returns the derived Df, or `null` when the duration is not a positive number. */
export function deriveDecrementFactor(faultDuration: unknown): number | null {
  if (
    typeof faultDuration !== "number" ||
    !Number.isFinite(faultDuration) ||
    faultDuration <= 0
  ) {
    return null;
  }
  const row = DECREMENT_FACTOR_TABLE.find(
    (entry) => faultDuration >= entry.fromSeconds
  );
  return row ? row.factor : null;
}

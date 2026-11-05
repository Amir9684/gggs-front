export type SplitMethod = 'SONI' | 'IEEE80';

/** Result stored by the last calculation of a project. */
export interface SplitProjectResult {
  /** Percent of the fault current that flows into the grid. */
  splitFactor: number;
  computedAt: string;
  details: Record<string, unknown>;
}

/** Mirrors `SplitProject` on the backend. */
export interface SplitProject {
  id: string;
  name: string;
  method: SplitMethod;
  /** The method's validated input (same shape as its calculate payload). */
  input: Record<string, unknown>;
  /** `null` until calculated, and again after the input changes. */
  lastResult: SplitProjectResult | null;
  createdAt: string;
  updatedAt: string;
}

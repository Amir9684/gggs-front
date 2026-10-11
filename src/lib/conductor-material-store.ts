import type { ConductorMaterial } from "../types/conductor-material";

/**
 * The backend has no conductor-material/sizing concept at all (unlike
 * `designMethod`, which now has real backend support — see `enum/index.ts`
 * in the backend's `calculations` module), so this keeps the choice (and
 * the computed result, so the detail page doesn't have to recompute it)
 * in localStorage, keyed by calculation-case id. Delete this once the
 * backend adds a real field and switch to the API response instead.
 */
const PREFIX = "gggs_conductor_sizing:";

export interface StoredConductorSizing {
  material: ConductorMaterial;
  ambientTempC: number;
  areaKcmil: number;
  areaMm2: number;
}

export function getConductorSizing(
  caseId: string,
): StoredConductorSizing | null {
  const raw = localStorage.getItem(PREFIX + caseId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredConductorSizing;
  } catch {
    return null;
  }
}

export function setConductorSizing(
  caseId: string,
  sizing: StoredConductorSizing,
): void {
  localStorage.setItem(PREFIX + caseId, JSON.stringify(sizing));
}

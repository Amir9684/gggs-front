/** Suggested values for the free-text "standard" field — the legacy tool exposed these as a method picker (IEEE 80-86 / IEEE 80-2000 / Galerkin). */
export const DESIGN_STANDARDS = ['IEEE 80-2000', 'IEEE 80-86', 'Galerkin'] as const;
export type DesignStandard = (typeof DESIGN_STANDARDS)[number];

/** Mirrors `Project` entity on the backend. `owner` isn't join-selected by `getAll`/`getOne`, so treat it as possibly absent. */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  substationName: string;
  voltageLevel: string;
  standard: string;
  owner?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}
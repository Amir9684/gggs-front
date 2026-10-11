/**
 * The grounding-design calculation method a case is analyzed with.
 *
 * Backed by `CalculationCase.designMethod`/`soilLayering` on the server —
 * see `enum/index.ts` in the backend's `calculations` module. The engine
 * (`safety-evaluation.engine.ts`) still only actually implements IEEE
 * 80-2013: picking IEEE 80-86 or Galerkin persists the choice, but
 * `POST /calculation-cases/:id/run` refuses to execute for it (400) until
 * that method's engine exists — see `IMPLEMENTED_DESIGN_METHODS` on the
 * backend.
 */
export const DesignMethod = {
  IEEE_80_86: "IEEE_80_86",
  IEEE_80_2000: "IEEE_80_2000",
  GALERKIN: "GALERKIN",
} as const;

export type DesignMethod = (typeof DesignMethod)[keyof typeof DesignMethod];

/** Only meaningful when `method === DesignMethod.IEEE_80_2000` (matches the demo's submenu). */
export const SoilLayeringMethod = {
  ONE_LAYER: "ONE_LAYER",
  TWO_LAYER: "TWO_LAYER",
} as const;

export type SoilLayeringMethod =
  (typeof SoilLayeringMethod)[keyof typeof SoilLayeringMethod];

export const DESIGN_METHOD_LABELS_FA: Record<DesignMethod, string> = {
  [DesignMethod.IEEE_80_86]: "IEEE 80-86",
  [DesignMethod.IEEE_80_2000]: "IEEE 80-2000",
  [DesignMethod.GALERKIN]: "گالرکین (Galerkin)",
};

export const SOIL_LAYERING_LABELS_FA: Record<SoilLayeringMethod, string> = {
  [SoilLayeringMethod.ONE_LAYER]: "تک‌لایه",
  [SoilLayeringMethod.TWO_LAYER]: "دولایه",
};

/** What the form collects; `soilLayering` only applies to IEEE 80-2000. */
export interface DesignMethodSelection {
  method: DesignMethod;
  soilLayering?: SoilLayeringMethod;
}

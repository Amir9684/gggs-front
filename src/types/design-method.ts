/**
 * The grounding-design calculation method a case is analyzed with.
 *
 * Backed by `CalculationCase.designMethod`/`soilLayering` on the server —
 * see `enum/index.ts` in the backend's `calculations` module. IEEE 80-86 and
 * IEEE 80-2000 have engines; picking Galerkin persists the choice, but
 * `POST /calculation-cases/:id/run` refuses to execute for it (400) until
 * its engine exists — see `IMPLEMENTED_DESIGN_METHODS` on the backend.
 */
export const DesignMethod = {
  IEEE_80_86: "IEEE_80_86",
  IEEE_80_2000: "IEEE_80_2000",
  GALERKIN: "GALERKIN",
} as const;

export type DesignMethod = (typeof DesignMethod)[keyof typeof DesignMethod];

/** Soil model type of the IEEE methods (80-86 and 80-2000). `TWO_LAYER` needs a soil model with exactly two layers. */
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

/** What the form collects; `soilLayering` applies to both IEEE methods. */
export interface DesignMethodSelection {
  method: DesignMethod;
  soilLayering?: SoilLayeringMethod;
}

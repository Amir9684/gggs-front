/**
 * Grounding-conductor materials and their IEEE Std 80-2013 Table 1
 * constants, used by `lib/conductor-sizing.ts` to compute the minimum
 * permissible conductor cross-section for a fault current/duration (the
 * demo's "Material of Conductor" step, which calculates the permissible
 * conductor area after a material is picked).
 *
 * Same situation as `design-method.ts`: the backend has no conductor/
 * sizing concept anywhere (no entity, no DTO field, no engine module), so
 * this material catalog and the sizing math both live entirely on the
 * frontend for now. See `lib/conductor-material-store.ts` for how a
 * selection is persisted until the backend catches up.
 */
export const ConductorMaterial = {
  COPPER_ANNEALED_SOFT_DRAWN: "COPPER_ANNEALED_SOFT_DRAWN",
  COPPER_COMMERCIAL_HARD_DRAWN: "COPPER_COMMERCIAL_HARD_DRAWN",
  COPPER_CLAD_STEEL_WIRE: "COPPER_CLAD_STEEL_WIRE",
  ALUMINUM_EC_GRADE: "ALUMINUM_EC_GRADE",
  ALUMINUM_CLAD_STEEL_WIRE: "ALUMINUM_CLAD_STEEL_WIRE",
  STEEL_1020: "STEEL_1020",
  STAINLESS_STEEL_304: "STAINLESS_STEEL_304",
} as const;

export type ConductorMaterial =
  (typeof ConductorMaterial)[keyof typeof ConductorMaterial];

export const CONDUCTOR_MATERIAL_LABELS_FA: Record<ConductorMaterial, string> =
  {
    [ConductorMaterial.COPPER_ANNEALED_SOFT_DRAWN]: "مس نرم (Annealed Soft-Drawn)",
    [ConductorMaterial.COPPER_COMMERCIAL_HARD_DRAWN]: "مس سخت تجاری (Hard-Drawn)",
    [ConductorMaterial.COPPER_CLAD_STEEL_WIRE]: "سیم فولاد روکش‌مس (Copper-Clad Steel)",
    [ConductorMaterial.ALUMINUM_EC_GRADE]: "آلومینیوم EC",
    [ConductorMaterial.ALUMINUM_CLAD_STEEL_WIRE]: "سیم فولاد روکش‌آلومینیوم",
    [ConductorMaterial.STEEL_1020]: "فولاد 1020",
    [ConductorMaterial.STAINLESS_STEEL_304]: "فولاد ضدزنگ 304",
  };

/**
 * IEEE Std 80-2013 Table 1 constants for each material.
 *
 * - `tm`: maximum allowable (fusing) temperature, °C
 * - `alphaR`: thermal coefficient of resistivity at 20°C, 1/°C
 * - `rhoR`: resistivity at 20°C, µΩ·cm
 * - `tcap`: thermal capacity per unit volume, J/(cm³·°C)
 * - `k0`: (1/α0) − 20, °C — used in the fusing-temperature log term
 */
export interface ConductorMaterialConstants {
  tm: number;
  alphaR: number;
  rhoR: number;
  tcap: number;
  k0: number;
}

export const CONDUCTOR_MATERIAL_CONSTANTS: Record<
  ConductorMaterial,
  ConductorMaterialConstants
> = {
  [ConductorMaterial.COPPER_ANNEALED_SOFT_DRAWN]: {
    tm: 1083,
    alphaR: 0.00393,
    rhoR: 1.72,
    tcap: 3.4,
    k0: 234,
  },
  [ConductorMaterial.COPPER_COMMERCIAL_HARD_DRAWN]: {
    tm: 1084,
    alphaR: 0.00381,
    rhoR: 1.78,
    tcap: 3.4,
    k0: 242,
  },
  [ConductorMaterial.COPPER_CLAD_STEEL_WIRE]: {
    tm: 1084,
    alphaR: 0.00378,
    rhoR: 2.4,
    tcap: 3.85,
    k0: 245,
  },
  [ConductorMaterial.ALUMINUM_EC_GRADE]: {
    tm: 657,
    alphaR: 0.00403,
    rhoR: 2.86,
    tcap: 2.5,
    k0: 228,
  },
  [ConductorMaterial.ALUMINUM_CLAD_STEEL_WIRE]: {
    tm: 657,
    alphaR: 0.0036,
    rhoR: 3.22,
    tcap: 3.58,
    k0: 258,
  },
  [ConductorMaterial.STEEL_1020]: {
    tm: 1510,
    alphaR: 0.00378,
    rhoR: 15.9,
    tcap: 3.8,
    k0: 245,
  },
  [ConductorMaterial.STAINLESS_STEEL_304]: {
    tm: 1400,
    alphaR: 0.0013,
    rhoR: 72.0,
    tcap: 4.0,
    k0: 749,
  },
};

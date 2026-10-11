/**
 * Conductor materials, sizing and the per-case conductor — mirrors the
 * backend's `ConductorMaterial` enum, `/conductors/*` endpoints and
 * `CaseConductor` entity.
 *
 * The material constants (α, K0, Tm, ρr, TCAP) are NOT kept here any more:
 * the backend owns them (the same 14 IEEE 80 Table 1 materials the Windows
 * GGGS app uses) and serves them from `GET /conductors/materials`. See
 * `hooks/useConductorMaterials.ts`.
 */
export const ConductorMaterial = {
  COPPER_ANNEALED_SOFT_DRAWN: "COPPER_ANNEALED_SOFT_DRAWN",
  COPPER_COMMERCIAL_HARD_DRAWN: "COPPER_COMMERCIAL_HARD_DRAWN",
  COPPER_CLAD_STEEL_1: "COPPER_CLAD_STEEL_1",
  COPPER_CLAD_STEEL_2: "COPPER_CLAD_STEEL_2",
  COPPER_CLAD_STEEL_3: "COPPER_CLAD_STEEL_3",
  COPPER_CLAD_STEEL_4: "COPPER_CLAD_STEEL_4",
  ALUMINUM_EC_GRADE: "ALUMINUM_EC_GRADE",
  ALUMINUM_ALLOY_5005: "ALUMINUM_ALLOY_5005",
  ALUMINUM_ALLOY_6201: "ALUMINUM_ALLOY_6201",
  ALUMINUM_CLAD_STEEL_1: "ALUMINUM_CLAD_STEEL_1",
  ALUMINUM_CLAD_STEEL_2: "ALUMINUM_CLAD_STEEL_2",
  ZINC_COATED_STEEL_1: "ZINC_COATED_STEEL_1",
  ZINC_COATED_STEEL_2: "ZINC_COATED_STEEL_2",
  STAINLESS_STEEL_304: "STAINLESS_STEEL_304",
} as const;

export type ConductorMaterial =
  (typeof ConductorMaterial)[keyof typeof ConductorMaterial];

/** One entry of `GET /conductors/materials`. */
export interface ConductorMaterialInfo {
  id: ConductorMaterial;
  /** Name as shown in the Windows GGGS picker. */
  name: string;
  /** αr, 1/°C at 20 °C. */
  alphaR: number;
  k0: number;
  /** Tm, the default allowable (fusing) temperature, °C. */
  fusingTemperature: number;
  /** ρr, µΩ·cm at 20 °C. */
  rhoR: number;
  tcap: number;
  /** Conduction time (s) the Windows picker pre-fills for this material. */
  defaultDuration: number;
}

/** Payload of `GET /conductors/materials`. */
export interface ConductorMaterialsResponse {
  materials: ConductorMaterialInfo[];
  /** Standard sizes (mm²): 16 … 300. */
  standardSizesMm2: number[];
}

/** Body of `POST /conductors/sizing`. */
export interface ConductorSizingPayload {
  material: ConductorMaterial;
  /** Fault current, A. */
  faultCurrent: number;
  /** Conduction time tc, s. */
  duration: number;
  /** Ta, °C. The backend defaults it to 40. */
  ambientTemperature?: number;
  /** Tm, °C. The backend defaults it to the material's fusing temperature. */
  allowableTemperature?: number;
}

/** Response of `POST /conductors/sizing`. */
export interface ConductorSizingResult {
  minimumAreaMm2: number;
  minimumAreaKcmil: number;
  /** Next standard size at or above the minimum; `null` above 300 mm². */
  standardSizeMm2: number | null;
  /** The Tm actually used, °C. */
  allowableTemperature: number;
}

/** The `conductor` object of the create-case payload. */
export interface CaseConductorPayload {
  material: ConductorMaterial;
  ambientTemperature?: number;
  allowableTemperature?: number;
  /** Defaults to the case's fault duration. */
  sizingDuration?: number;
  /** A cross-section the user entered instead of a standard size, mm². */
  crossSectionMm2?: number;
}

/** Mirrors the backend `CaseConductor` entity (plus `crossSectionAdequate`). */
export interface CaseConductor {
  id: string;
  material: ConductorMaterial;
  ambientTemperature: number;
  allowableTemperature: number;
  sizingDuration: number;
  minimumAreaMm2: number;
  minimumAreaKcmil: number;
  standardSizeMm2: number | null;
  crossSectionMm2: number | null;
  /** `true`/`false` once a cross-section was entered; `null` otherwise. */
  crossSectionAdequate: boolean | null;
  createdAt: string;
  updatedAt: string;
}

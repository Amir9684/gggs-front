import {
  CONDUCTOR_MATERIAL_CONSTANTS,
  type ConductorMaterial,
} from "../types/conductor-material";

/** 1 kcmil = 0.5067 mm². */
const MM2_PER_KCMIL = 0.5067;

export interface ConductorSizingInput {
  /** Symmetrical rms fault current, kA. */
  faultCurrentKA: number;
  /** Fault-clearing time, s. */
  faultDurationS: number;
  material: ConductorMaterial;
  /** Ambient temperature, °C. Defaults to 40°C (a common IEEE 80 design assumption). */
  ambientTempC?: number;
}

export interface ConductorSizingResult {
  areaKcmil: number;
  areaMm2: number;
}

/**
 * Minimum conductor cross-section for fusing, IEEE Std 80-2013 Eq. 37:
 *
 *   A(kcmil) = I × 197.4 / sqrt( (TCAP × 10⁻⁴ / (t_c × α_r × ρ_r)) × ln((K0+Tm)/(K0+Ta)) )
 *
 * `I` is in kA, `t_c` in seconds. Constants come from Table 1 for the
 * chosen material. Mirrors the shape of the backend's own `*.engine.ts`
 * files (small pure function, IEEE-cited in a doc comment) even though it
 * currently has no backend counterpart — see the note in
 * `types/conductor-material.ts`.
 */
export function calculateConductorSizing({
  faultCurrentKA,
  faultDurationS,
  material,
  ambientTempC = 40,
}: ConductorSizingInput): ConductorSizingResult {
  const { tm, alphaR, rhoR, tcap, k0 } =
    CONDUCTOR_MATERIAL_CONSTANTS[material];

  const logTerm = Math.log((k0 + tm) / (k0 + ambientTempC));
  const denominator = Math.sqrt(
    ((tcap * 1e-4) / (faultDurationS * alphaR * rhoR)) * logTerm,
  );

  const areaKcmil = (faultCurrentKA * 197.4) / denominator;
  const areaMm2 = areaKcmil * MM2_PER_KCMIL;

  return { areaKcmil, areaMm2 };
}

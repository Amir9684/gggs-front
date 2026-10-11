import type { CaseConductor } from "./conductor";
import type { DesignMethod, SoilLayeringMethod } from "./design-method";

/** Mirrors `CaseFault` entity on the backend. */
export interface CaseFault {
  id: string;
  faultCurrent: number;
  faultDuration: number;
  splitFactor: number;
  decrementFactor: number;
  shockDuration: number;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `CaseSetting` entity on the backend. */
export interface CaseSetting {
  id: string;
  surfaceLayerResistivity: number;
  surfaceLayerThickness: number;
  bodyWeight: number;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors `CalculationCase` entity on the backend. `getAll` only
 * `leftJoinAndSelect`s `project`/`grid`/`soilModel` — `fault`/`settings`
 * come back only from `getOne` (and `create`, which returns them inline
 * right after the transaction). Treat both as possibly absent anywhere a
 * `CalculationCase` might have come from the list endpoint.
 */
export interface CalculationCase {
  id: string;
  name: string;
  description: string;
  project?: { id: string; name: string } | null;
  grid?: { id: string; name: string } | null;
  soilModel?: { id: string; name: string } | null;
  fault?: CaseFault | null;
  settings?: CaseSetting | null;
  /**
   * The conductor chosen for the case, from `getOne`/`create`. `null` when
   * the case has none (e.g. created before conductors were stored);
   * `undefined` on the list endpoint and from an older backend.
   */
  conductor?: CaseConductor | null;
  designMethod: DesignMethod;
  /** Only set when `designMethod === DesignMethod.IEEE_80_2000`. */
  soilLayering: SoilLayeringMethod | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors a `StepVoltageMap` / `TouchVoltageMap` row — a single (x, y, value) sample point. */
export interface SamplePoint {
  id: string;
  x: number;
  y: number;
  value: number;
}

/** Mirrors a `VoltageProfile` row — same shape as `SamplePoint`, but the column is named `voltage` on the backend. */
export interface VoltageProfilePoint {
  id: string;
  x: number;
  y: number;
  voltage: number;
}

/** Permissible touch/step voltage (V) for one reference body weight. */
export interface PermissibleVoltageSet {
  touch: number;
  step: number;
}

/** A validity-limit caution from the backend (`design-validity.engine`). */
export interface DesignWarning {
  code: "BURIAL_DEPTH_OUT_OF_RANGE" | "CONDUCTOR_DIAMETER_TOO_LARGE";
  /** Persian message, ready to show as-is. */
  message: string;
  value: number;
  limit: number;
}

/** Conductor and mesh counts of the evaluated grid. */
export interface GridMeshSummary {
  conductorCountAlongLength: number;
  conductorCountAlongWidth: number;
  meshCount: number;
  averageSpacing: number;
  totalConductorLength: number;
  rodCount: number;
  totalRodLength: number;
}

/** Intermediate engine values kept with every result. */
export interface CalculationResultDetails {
  effectiveGridCurrent: number;
  cs: number;
  geometricFactors: {
    km: number;
    ki: number;
    kii: number;
    kh: number;
    ks: number;
    n: number;
    /** IEEE 80-86 only: n used for the step-voltage factors. */
    nStep?: number;
    /** IEEE 80-86 only: Ki evaluated at `nStep`, used for the step voltage. */
    kiStep?: number;
  };
  /** Permissible voltages for both 50 kg and 70 kg bodies. */
  permissibleVoltages: {
    kg50: PermissibleVoltageSet;
    kg70: PermissibleVoltageSet;
  };
  /** Validity-limit cautions; empty when the design is inside all limits. */
  warnings: DesignWarning[];
  /** True when GPR <= permissible touch voltage: safe at every point. */
  safeForEveryPoint: boolean;
  grid: GridMeshSummary;
}

/**
 * Mirrors the `CalculationResult` payload returned by `POST
 * /calculation-cases/:id/run` and `GET /calculation-cases/:id/results` —
 * the base entity plus `details` (the engine's intermediate values; both
 * endpoints return it, `null` on results saved before it was persisted)
 * and (on `getResults` only) the three sample-point maps used for
 * visualization.
 */
export interface CalculationResult {
  id: string;
  calculationCase?: { id: string } | null;
  gridResistance: number;
  gpr: number;
  meshVoltage: number;
  touchVoltage: number;
  stepVoltage: number;
  permissibleTouchVoltage: number;
  permissibleStepVoltage: number;
  safe: boolean;
  createdAt: string;
  updatedAt: string;
  /** Intermediate engine values; `null` for results saved before they were persisted. */
  details?: CalculationResultDetails | null;
  /** Only present on the response from `getResults`. */
  stepVoltageMap?: SamplePoint[];
  /** Only present on the response from `getResults`. */
  touchVoltageMap?: SamplePoint[];
  /** Only present on the response from `getResults`. */
  voltageProfile?: VoltageProfilePoint[];
}

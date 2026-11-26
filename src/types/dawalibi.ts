import type { Complex, ComplexValue, GroundWireInput } from './split-factor';

export interface DawalibiSpanPayload {
  /** Span length (m). */
  length: number;
  /** Footing resistance of the tower at the end of the span (ohm). */
  towerFootingResistance: number;
}

export interface DawalibiLinePayload {
  name?: string;
  /** Equivalent source voltage behind the remote end of the line (V). */
  voltageSource: Complex;
  groundWire: GroundWireInput;
  /** Mutual impedance ground wire - phase conductor, same unit as Zgw (ohm/km). */
  mutualImpedance: Complex;
  /** Phase conductor impedance per span (ohm); the Windows program uses 0.1 + j0.425. */
  phaseImpedancePerSpan: Complex;
  /** At least two spans. */
  spans: DawalibiSpanPayload[];
}

/** Matches `dawalibiCalculateSchema` on the backend. */
export interface DawalibiCalculatePayload {
  gridResistance: number;
  frequency?: number;
  lines: DawalibiLinePayload[];
}

export interface DawalibiLineResult {
  name: string | null;
  groundWireImpedance: ComplexValue;
  /** Phase conductor current of the line, IF. */
  lineCurrent: ComplexValue;
  /** Current into the remote substation, Ik. */
  remoteCurrent: ComplexValue;
  /** First mesh current: this line's share of the grid current. */
  firstMeshCurrent: ComplexValue;
  spanCount: number;
  /** Total line length (km). */
  lineLength: number;
}

export interface DawalibiCalculationResult {
  /** Percent of the arc current that flows into the grid. */
  splitFactor: number;
  warnings: string[];
  gridCurrent: ComplexValue;
  totalFaultCurrent: ComplexValue;
  lines: DawalibiLineResult[];
}

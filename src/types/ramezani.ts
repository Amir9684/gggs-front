import type { Complex, ComplexValue, GroundWireInput } from './split-factor';

export interface RamezaniSpanPayload {
  /** Span length (m). */
  length: number;
  /** Footing resistance of the tower at the end of the span (ohm). */
  towerFootingResistance: number;
}

export interface RamezaniTerminalPayload {
  name?: string;
  faultCurrent: Complex;
  groundWire: GroundWireInput;
  /** Mutual impedance ground wire - phase conductors, same unit as Zgw (ohm/km). */
  mutualImpedance: Complex;
  spans: RamezaniSpanPayload[];
  /** Fraction of the line with a ground wire; 1 = continuous. */
  groundWireFraction: number;
}

/** Matches `ramezaniCalculateSchema` on the backend. */
export interface RamezaniCalculatePayload {
  gridResistance: number;
  frequency?: number;
  /** Total fault current IG for a fault in the vicinity; zero = fault inside the substation. */
  groundFaultCurrent: Complex;
  terminals: RamezaniTerminalPayload[];
}

export interface RamezaniTerminalResult {
  name: string | null;
  groundWireImpedance: ComplexValue;
  equivalentImpedance: ComplexValue;
  voltageCoefficient: ComplexValue;
  mutualFactor: ComplexValue;
  earthCurrent: ComplexValue;
  spanCount: number;
  /** Total line length (km). */
  lineLength: number;
}

export interface RamezaniCalculationResult {
  /** Percent of the fault current that flows into the grid. */
  splitFactor: number;
  warnings: string[];
  gridCurrent: ComplexValue;
  totalFaultCurrent: ComplexValue;
  terminals: RamezaniTerminalResult[];
}

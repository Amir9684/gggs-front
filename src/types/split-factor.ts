/** Mirrors `GroundWire` on the backend (ground wire catalog entry). */
export interface GroundWire {
  id: string;
  name: string;
  /** Rac (ohm/km). */
  acResistance: number;
  /** Rdc (ohm/km). */
  dcResistance: number;
  /** Geometric mean radius (m). */
  gmr: number;
  /** Internal reactance (ohm/km). */
  reactance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Complex {
  re: number;
  im: number;
}

/** A complex quantity as the backend returns it. */
export interface ComplexValue extends Complex {
  magnitude: number;
  angleDegrees: number;
}

export type ResistanceSource = 'AC' | 'DC';
export type ReactanceSource = 'GMR' | 'REACTANCE';

export type GroundWireInput =
  | { source: 'DIRECT'; impedance: Complex }
  | {
      source: 'CATALOG';
      groundWireId: string;
      earthResistivity: number;
      resistanceSource: ResistanceSource;
      reactanceSource: ReactanceSource;
    };

export interface SoniTerminalPayload {
  name?: string;
  faultCurrent: Complex;
  spanLength: number;
  towerFootingResistance: number;
  groundWire: GroundWireInput;
  mutualImpedance: Complex;
}

/** Matches `soniCalculateSchema` on the backend. */
export interface SoniCalculatePayload {
  gridResistance: number;
  frequency?: number;
  terminals: SoniTerminalPayload[];
}

export interface SoniCalculationResult {
  /** Percent of the total fault current that flows into the grid. */
  splitFactor: number;
  gridCurrent: ComplexValue;
  totalFaultCurrent: ComplexValue;
  terminals: Array<{
    name: string | null;
    equivalentImpedance: ComplexValue;
    earthCurrent: ComplexValue;
  }>;
}

/** 1 = 100 % remote source, 2 = 75 % remote / 25 % local, 3 = 50 / 50, 4 = 25 / 75. */
export type Ieee80FaultType = 1 | 2 | 3 | 4;

/** 1 = tower footing 15 / 25 ohm (well grounded), 2 = 100 / 200 ohm (poorly grounded). */
export type Ieee80FootingSet = 1 | 2;

/** Matches `ieee80CalculateSchema` on the backend. */
export interface Ieee80CalculatePayload {
  faultType: Ieee80FaultType;
  footingSet: Ieee80FootingSet;
  transmissionLines: number;
  distributionLines: number;
  gridResistance: number;
}

export interface Ieee80CalculationResult {
  /** Percent of the fault current that flows into the grid. */
  splitFactor: number;
  /** Set when Rg is outside 0.1 to 25 ohm and the nearest tabulated value was used. */
  clamped: "LOW" | "HIGH" | null;
}

import type { ConductorMaterial } from "./conductor";
import type { Geometry, GridElementType } from "./grid";

/**
 * Mirrors the backend's `LegacyGgggsImport` (`src/legacy/legacy-gggs.parser.ts`):
 * what `POST /legacy-import/gggs/parse` returns for a Windows `.gggs` file.
 */
export type LegacyFormat = "full" | "full-two-depth" | "grid-only";

export type LegacyWarning =
  | { code: "RODS_WITHOUT_LENGTH" }
  | { code: "WELLS_WITHOUT_DEPTH" }
  | { code: "GRID_ONLY_FILE" }
  | { code: "BURIAL_DEPTH_MISSING" }
  | { code: "SECOND_DEPTH_IGNORED"; nodeCount: number }
  | { code: "UNKNOWN_MATERIAL"; name: string };

export interface LegacyElement {
  type: GridElementType;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

export interface LegacyImport {
  fileName: string;
  format: LegacyFormat;
  soil: {
    resistivity: number;
    surfaceLayerResistivity: number;
    surfaceLayerThickness: number;
  } | null;
  fault: {
    faultCurrent: number;
    shockDuration: number;
    faultDuration: number | null;
  } | null;
  conductor: {
    name: string;
    material: ConductorMaterial | null;
    ambientTemperature: number;
    crossSectionMm2: number;
  } | null;
  segmentLengthM: number | null;
  grid: {
    length: number;
    width: number;
    nodeCount: number;
    conductorCount: number;
    rodCount: number;
    wellCount: number;
  };
  elements: LegacyElement[];
  secondDepthNodeCount: number;
  warnings: LegacyWarning[];
}

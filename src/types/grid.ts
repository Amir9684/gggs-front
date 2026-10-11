/**
 * Mirrors `GridElementType` enum on the backend (`src/grids/enum/index.ts`).
 * It's a plain numeric TS enum there (no explicit values), so member order
 * is load-bearing — don't reorder without changing the backend in lockstep.
 */
export const GridElementType = {
  CONDUCTOR: 0,
  ROD: 1,
  WELL: 2,
  FENCE: 3,
  EQUIPMENT: 4,
  BUILDING: 5,
  GATE: 6,
} as const;

export type GridElementType =
  (typeof GridElementType)[keyof typeof GridElementType];

export const GRID_ELEMENT_TYPE_LABELS_FA: Record<GridElementType, string> = {
  [GridElementType.CONDUCTOR]: "هادی",
  [GridElementType.ROD]: "میلهٔ ارت",
  [GridElementType.WELL]: "چاه ارت",
  [GridElementType.FENCE]: "حصار",
  [GridElementType.EQUIPMENT]: "تجهیزات",
  [GridElementType.BUILDING]: "ساختمان",
  [GridElementType.GATE]: "دروازه",
};

/**
 * A minimal GeoJSON geometry mirroring `geometry.schema.ts` on the backend
 * (Point / LineString / Polygon only). Coordinates are in the grid's local
 * meter-based plane, not real-world lng/lat.
 */
export type Position = [number, number, ...number[]];

export interface PointGeometry {
  type: "Point";
  coordinates: Position;
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

export type Geometry = PointGeometry | LineStringGeometry | PolygonGeometry;

/** Mirrors `GridElement` entity on the backend. */
export interface GridElement {
  id: string;
  type: GridElementType;
  geometry: Geometry;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors `Grid` entity on the backend. `elements` are never join-selected
 * by `grids.service.ts` (only `project` is) — they're a separate resource,
 * fetched via `GET /grid-elements?gridId=...`.
 */
export interface Grid {
  id: string;
  name: string;
  length: number;
  width: number;
  burialDepth: number;
  project?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
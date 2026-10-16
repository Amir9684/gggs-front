import { apiClient } from "../lib/api-client";
import type { Geometry, GridElement, GridElementType } from "../types/grid";

/** Matches `createGridElementSchema` (`CreateGridElementDto`). */
export interface CreateGridElementPayload {
  gridId: string;
  type: GridElementType;
  geometry: Geometry;
  properties?: Record<string, unknown>;
}

/** A single element within a bulk save — same shape minus `gridId` (shared at the batch level). */
export interface BulkGridElementPayload {
  type: GridElementType;
  geometry: Geometry;
  properties?: Record<string, unknown>;
}

/** Matches `createGridElementsBulkSchema` (`CreateGridElementsBulkDto`). */
export interface SaveGridElementsBulkPayload {
  gridId: string;
  /**
   * New plan size / burial depth of the grid, saved in the same transaction
   * as the elements (a generated layout and its grid dimensions must not be
   * saved apart). Omitted fields are left unchanged.
   */
  grid?: {
    length?: number;
    width?: number;
    burialDepth?: number;
  };
  elements: BulkGridElementPayload[];
}

/** Matches `updateGridElementSchema` (`UpdateGridElementDto`). */
export interface UpdateGridElementPayload {
  id: string;
  type?: GridElementType;
  geometry?: Geometry;
  properties?: Record<string, unknown>;
}

/** Matches `GetGridElementsQueryDTO`. */
export interface GetGridElementsQuery {
  gridId: string;
  type?: GridElementType;
}

/** Mirrors `GridSnapshot` entity on the backend. */
export interface GridSnapshot {
  id: string;
  version: number;
  snapshotData: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET /grid-elements` returns a plain array (`grid-elements.service.ts`
 * → `getAll` sets `data: list`), unlike the paginated `{ list, pagination }`
 * shape used by `/grids` and `/projects`.
 */
export const gridElementsApi = {
  getAll: (query: GetGridElementsQuery) =>
    apiClient.get<GridElement[]>("/grid-elements", {
      // `gridId` is required here (unlike the other list queries, which are
      // all-optional filters), so this needs the `unknown` detour — TS
      // won't allow a direct assertion when a required prop makes the
      // source and `Record<string, unknown>` not "sufficiently overlap".
      params: query as unknown as Record<string, unknown>,
    }),

  create: (payload: CreateGridElementPayload) =>
    apiClient.post<GridElement>("/grid-elements", payload),

  /**
   * Replaces every element belonging to `payload.gridId` with the given
   * batch, inside one transaction on the backend. This is the "save the
   * canvas" action after drawing or editing a grid interactively — the
   * editor keeps changes local until this is called.
   */
  saveBulk: (payload: SaveGridElementsBulkPayload) =>
    apiClient.post<GridElement[]>("/grid-elements/bulk", payload),

  update: (id: string, payload: UpdateGridElementPayload) =>
    apiClient.put<GridElement>(`/grid-elements/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<{ id: string }>(`/grid-elements/${id}`),
};

export const gridSnapshotsApi = {
  getAll: (gridId: string) =>
    apiClient.get<GridSnapshot[]>("/grid-snapshots", {
      params: { gridId },
    }),

  create: (gridId: string) =>
    apiClient.post<GridSnapshot>("/grid-snapshots", { gridId }),

  /** Restores a grid's elements from a snapshot; returns the resulting element list. */
  restore: (id: string) =>
    apiClient.post<GridElement[]>(`/grid-snapshots/${id}/restore`),
};

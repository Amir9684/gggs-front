import { apiClient } from "../lib/api-client";
import type { PaginatedResult } from "../types/api";
import type { Grid } from "../types/grid";

/** Matches `createGridSchema` (`CreateGridDto`). */
export interface CreateGridPayload {
  projectId: string;
  name: string;
  length: number;
  width: number;
  burialDepth: number;
}

/** Matches `updateGridSchema` (`UpdateGridDto`) — same fields (minus `projectId`), all optional, plus id. */
export interface UpdateGridPayload
  extends Partial<Omit<CreateGridPayload, "projectId">> {
  id: string;
}

/** Matches `GetGridsQueryDTO`. */
export interface GetGridsQuery {
  projectId?: string;
  name?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const gridsApi = {
  getAll: (query: GetGridsQuery = {}) =>
    apiClient.get<PaginatedResult<Grid>>("/grids", {
      params: query as Record<string, unknown>,
    }),

  getOne: (id: string) => apiClient.get<Grid>(`/grids/${id}`),

  create: (payload: CreateGridPayload) =>
    apiClient.post<Grid>("/grids", payload),

  update: (id: string, payload: UpdateGridPayload) =>
    apiClient.put<Grid>(`/grids/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/grids/${id}`),
};
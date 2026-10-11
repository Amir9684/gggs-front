import { apiClient } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';
import type { SoilModel } from '../types/soil';

/** Matches `soilLayerSchema` on the backend (used inside `createSoilModelSchema`). */
export interface CreateSoilLayerPayload {
  layerOrder: number;
  resistivity: number;
  thickness: number;
}

/** Matches `createSoilModelSchema` (`CreateSoilModelDto`). */
export interface CreateSoilModelPayload {
  projectId: string;
  name: string;
  surfaceResistivity: number;
  layers: CreateSoilLayerPayload[];
}

/** Matches `updateSoilLayerSchema` — same as create, but every field (plus `id`) is optional. Pass `id` to update an existing layer in place; omit it to append a new one. */
export interface UpdateSoilLayerPayload extends Partial<CreateSoilLayerPayload> {
  id?: string;
}

/** Matches `updateSoilModelSchema` (`UpdateSoilModelDto`) — layers, if present, wholesale-replace the model's layer set. */
export interface UpdateSoilModelPayload {
  id: string;
  name?: string;
  surfaceResistivity?: number;
  layers?: UpdateSoilLayerPayload[];
}

/** Matches `GetSoilModelsQueryDTO`. */
export interface GetSoilModelsQuery {
  projectId?: string;
  name?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const soilModelsApi = {
  getAll: (query: GetSoilModelsQuery = {}) =>
    apiClient.get<PaginatedResult<SoilModel>>('/soil-models', { params: query as Record<string, unknown> }),

  getOne: (id: string) => apiClient.get<SoilModel>(`/soil-models/${id}`),

  create: (payload: CreateSoilModelPayload) => apiClient.post<SoilModel>('/soil-models', payload),

  update: (id: string, payload: UpdateSoilModelPayload) => apiClient.put<SoilModel>(`/soil-models/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/soil-models/${id}`),
};
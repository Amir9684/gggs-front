import { apiClient } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';
import type { Project } from '../types/project';

/** Matches `createProjectSchema` (`CreateProjectDto`). */
export interface CreateProjectPayload {
  name: string;
  description?: string;
  substationName: string;
  voltageLevel: string;
  standard: string;
}

/** Matches `updateProjectSchema` (`UpdateProjectDto`) — same fields, all optional, plus id. */
export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  id: string;
}

/** Matches `GetProjectsQueryDTO`. */
export interface GetProjectsQuery {
  name?: string;
  substationName?: string;
  voltageLevel?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const projectsApi = {
  getAll: (query: GetProjectsQuery = {}) =>
    apiClient.get<PaginatedResult<Project>>('/projects', { params: query as Record<string, unknown> }),

  getOne: (id: string) => apiClient.get<Project>(`/projects/${id}`),

  create: (payload: CreateProjectPayload) => apiClient.post<Project>('/projects', payload),

  update: (id: string, payload: UpdateProjectPayload) =>
    apiClient.put<Project>(`/projects/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/projects/${id}`),
};
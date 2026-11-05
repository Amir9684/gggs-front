import { apiClient } from '../lib/api-client';
import type { SplitMethod, SplitProject } from '../types/split-project';

export const splitProjectsApi = {
  getAll: () => apiClient.get<SplitProject[]>('/split-projects'),

  create: (payload: { name: string; method: SplitMethod; input: unknown }) =>
    apiClient.post<SplitProject>('/split-projects', payload),

  update: (id: string, payload: { name?: string; input?: unknown }) =>
    apiClient.put<SplitProject>(`/split-projects/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/split-projects/${id}`),

  /** Runs the project's method on its stored input and stores the result. */
  calculate: (id: string) =>
    apiClient.post<SplitProject>(`/split-projects/${id}/calculate`),
};

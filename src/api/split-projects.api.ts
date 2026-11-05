import { apiClient, http } from '../lib/api-client';
import type { SplitMethod, SplitProject } from '../types/split-project';

export const splitProjectsApi = {
  getAll: () => apiClient.get<SplitProject[]>('/split-projects'),

  create: (payload: { name: string; method: SplitMethod; input: unknown }) =>
    apiClient.post<SplitProject>('/split-projects', payload),

  update: (id: string, payload: { name?: string; input?: unknown }) =>
    apiClient.put<SplitProject>(`/split-projects/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/split-projects/${id}`),

  /**
   * Downloads the project's report PDF (made from a fresh calculation).
   * Bypasses `apiClient` like `reportsApi.download`: the body is raw file
   * bytes, and the server names the file in `Content-Disposition`.
   */
  downloadReport: async (id: string, fallbackName: string) => {
    const response = await http.get(`/split-projects/${id}/report`, {
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    const fileName = encoded ? decodeURIComponent(encoded) : `${fallbackName}.pdf`;

    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Runs the project's method on its stored input and stores the result. */
  calculate: (id: string) =>
    apiClient.post<SplitProject>(`/split-projects/${id}/calculate`),
};

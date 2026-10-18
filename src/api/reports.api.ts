import { apiClient, http } from "../lib/api-client";
import type { PaginatedResult } from "../types/api";
import type { Report, ReportTemplate } from "../types/report";

/** Matches `generateReportSchema` (`GenerateReportDto`). */
export interface GenerateReportPayload {
  resultId: string;
  name?: string;
  /** Defaults to `AUTO` (the template matching the case). */
  template?: ReportTemplate;
  /** Include the intermediate values and methodology pages. Default true. */
  includeDetails?: boolean;
  /** Print the fault duration as "0.5 s or more". Omitted: follows the duration. */
  halfSecondVariant?: boolean;
}

/** Matches `GetReportsQueryDTO`. */
export interface GetReportsQuery {
  projectId?: string;
  resultId?: string;
  name?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const reportsApi = {
  getAll: (query: GetReportsQuery = {}) =>
    apiClient.get<PaginatedResult<Report>>("/reports", {
      params: query as Record<string, unknown>,
    }),

  getOne: (id: string) => apiClient.get<Report>(`/reports/${id}`),

  /** Builds the grounding-report PDF for a calculation result and stores it. */
  generate: (payload: GenerateReportPayload) =>
    apiClient.post<Report>("/reports", payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/reports/${id}`),

  /**
   * Streams the generated file and triggers a browser download. Bypasses
   * `apiClient` (see `http` in `api-client.ts`) since the response body is
   * raw file bytes, not the standard `ApiResponse<T>` envelope — the
   * server sets the filename via `Content-Disposition`, so it's read back
   * off the response headers here rather than guessed client-side.
   */
  download: async (id: string, fallbackName: string) => {
    const response = await http.get(`/reports/${id}/download`, {
      responseType: "blob",
    });

    // const header = await response.data.slice(0, 20).text();

    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const fileName = match?.[1] ?? fallbackName;

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};


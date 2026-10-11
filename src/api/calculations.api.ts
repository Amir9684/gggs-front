import { apiClient } from "../lib/api-client";
import type { PaginatedResult } from "../types/api";
import type { CalculationCase, CalculationResult } from "../types/calculation";
import type { CaseConductorPayload } from "../types/conductor";
import type { DesignMethod, SoilLayeringMethod } from "../types/design-method";

/** Matches the `fault` object inside `createCalculationCaseSchema`. */
export interface CaseFaultPayload {
  faultCurrent: number;
  faultDuration: number;
  splitFactor: number;
  /** Optional: omitted -> the backend derives it from `faultDuration`. */
  decrementFactor?: number;
  shockDuration: number;
}

/** Matches the `settings` object inside `createCalculationCaseSchema`. */
export interface CaseSettingPayload {
  surfaceLayerResistivity: number;
  surfaceLayerThickness: number;
  bodyWeight: number;
  frequency: number;
}

/** Matches `createCalculationCaseSchema` (`CreateCalculationCaseDto`). */
export interface CreateCalculationCasePayload {
  projectId: string;
  gridId: string;
  soilModelId: string;
  name: string;
  description?: string;
  /** `soilLayering` is required for IEEE 80-2000; IEEE 80-86 defaults to one layer when omitted. */
  designMethod: {
    method: DesignMethod;
    soilLayering?: SoilLayeringMethod;
  };
  fault: CaseFaultPayload;
  settings: CaseSettingPayload;
  /** Optional on the API; the form always sends it (a conductor is required there). */
  conductor?: CaseConductorPayload;
}

/**
 * Matches `updateCalculationCaseSchema` (`UpdateCalculationCaseDto`) â€” only
 * `name`/`description` are editable in place. The fault/settings inputs
 * that actually drive a run aren't patchable; re-creating the case is the
 * intended way to change them, which keeps every `CalculationResult`
 * traceable to the exact inputs that produced it.
 */
export interface UpdateCalculationCasePayload {
  id: string;
  name?: string;
  description?: string;
}

/** Matches `GetCalculationCasesQueryDTO`. */
export interface GetCalculationCasesQuery {
  projectId?: string;
  gridId?: string;
  soilModelId?: string;
  name?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const calculationCasesApi = {
  getAll: (query: GetCalculationCasesQuery = {}) =>
    apiClient.get<PaginatedResult<CalculationCase>>("/calculation-cases", {
      params: query as Record<string, unknown>,
    }),

  getOne: (id: string) =>
    apiClient.get<CalculationCase>(`/calculation-cases/${id}`),

  create: (payload: CreateCalculationCasePayload) =>
    apiClient.post<CalculationCase>("/calculation-cases", payload),

  update: (id: string, payload: UpdateCalculationCasePayload) =>
    apiClient.put<CalculationCase>(`/calculation-cases/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<{ id: string }>(`/calculation-cases/${id}`),

  /** Runs the IEEE 80 engine for this case and persists a new result. */
  run: (id: string) =>
    apiClient.post<CalculationResult>(`/calculation-cases/${id}/run`),

  /** Fetches the most recent result (with its sample maps) for this case. */
  getResults: (id: string) =>
    apiClient.get<CalculationResult>(`/calculation-cases/${id}/results`),
};

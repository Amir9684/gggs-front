import { apiClient } from "../lib/api-client";
import type {
  ConductorMaterialsResponse,
  ConductorSizingPayload,
  ConductorSizingResult,
} from "../types/conductor";

export const conductorsApi = {
  /** The 14 IEEE 80 Table 1 materials and the standard sizes (mm²). */
  getMaterials: () =>
    apiClient.get<ConductorMaterialsResponse>("/conductors/materials"),

  /** Minimum conductor area for a fault current, rounded up to a standard size. */
  calculateSizing: (payload: ConductorSizingPayload) =>
    apiClient.post<ConductorSizingResult>("/conductors/sizing", payload),
};

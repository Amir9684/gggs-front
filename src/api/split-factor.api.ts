import { apiClient } from '../lib/api-client';
import type {
  GroundWire,
  SoniCalculatePayload,
  SoniCalculationResult,
} from '../types/split-factor';

/** Matches `createGroundWireSchema`. */
export interface GroundWirePayload {
  name: string;
  acResistance: number;
  dcResistance: number;
  gmr: number;
  reactance: number;
}

export const groundWiresApi = {
  getAll: () => apiClient.get<GroundWire[]>('/ground-wires'),

  create: (payload: GroundWirePayload) =>
    apiClient.post<GroundWire>('/ground-wires', payload),

  update: (id: string, payload: GroundWirePayload) =>
    apiClient.put<GroundWire>(`/ground-wires/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/ground-wires/${id}`),
};

export const splitFactorApi = {
  /** Stateless: nothing is saved on the server. */
  calculateSoni: (payload: SoniCalculatePayload) =>
    apiClient.post<SoniCalculationResult>('/split-factor/soni/calculate', payload),
};

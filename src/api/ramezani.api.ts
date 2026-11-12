import { apiClient } from '../lib/api-client';
import type {
  RamezaniCalculatePayload,
  RamezaniCalculationResult,
} from '../types/ramezani';

export const ramezaniApi = {
  /** Stateless: computes the Ramezani split factor and saves nothing. */
  calculate: (payload: RamezaniCalculatePayload) =>
    apiClient.post<RamezaniCalculationResult>('/split-factor/ramezani/calculate', payload),
};

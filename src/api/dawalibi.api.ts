import { apiClient } from '../lib/api-client';
import type {
  DawalibiCalculatePayload,
  DawalibiCalculationResult,
} from '../types/dawalibi';

export const dawalibiApi = {
  /** Stateless: computes the Dawalibi split factor and saves nothing. */
  calculate: (payload: DawalibiCalculatePayload) =>
    apiClient.post<DawalibiCalculationResult>('/split-factor/dawalibi/calculate', payload),
};

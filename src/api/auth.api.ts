import { apiClient } from '../lib/api-client';
import type { User } from '../types/user';

export interface LoginPayload {
  username: string;
  password: string;
}

/** Matches `createUserSchema` — register reuses the create-user DTO on the backend. */
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface AuthResult {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResult>('/auth/login', payload, { skipAuth: true }),

  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResult>('/auth/register', payload, { skipAuth: true }),

  me: () => apiClient.get<User>('/auth/me'),
};
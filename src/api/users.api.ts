import { apiClient } from '../lib/api-client';
import type { PaginatedResult } from '../types/api';
import type { User, UserRole } from '../types/user';

/** Matches `CreateUserDto` — role isn't accepted here, new users are always ENGINEER (entity default). */
export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
}

/**
 * Matches `UpdateUserDto` (`createUserSchema.partial()` + id). Role is not
 * part of either DTO on the backend, so — despite the register page's copy
 * about "role changes are admin-only" — there is currently no endpoint that
 * changes a user's role. Only identity/credential fields are editable here.
 */
export interface UpdateUserPayload {
  id: string;
  username?: string;
  email?: string;
  password?: string;
}

/** Matches `GetUsersQueryDTO`. */
export interface GetUsersQuery {
  username?: string;
  email?: string;
  role?: UserRole;
  pageNumber?: number;
  pageSize?: number;
}

export const usersApi = {
  getAll: (query: GetUsersQuery = {}) =>
    apiClient.get<PaginatedResult<User>>('/users', { params: query as Record<string, unknown> }),

  getOne: (id: string) => apiClient.get<User>(`/users/${id}`),

  create: (payload: CreateUserPayload) => apiClient.post<User>('/users', payload),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.put<User>(`/users/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ id: string }>(`/users/${id}`),
};
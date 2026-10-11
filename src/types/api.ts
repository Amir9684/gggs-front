/**
 * Matches `IResponse<T>` from `src/common/types/index.ts` on the backend.
 * Every controller response is wrapped in this envelope by the global
 * `ResponseInterceptor` — including error responses thrown as
 * `HttpException`s via `createHttpException` (those use `message` instead
 * of `messages`, which `ApiError` below normalizes).
 */
export interface ApiResponse<T> {
  statusCode: number;
  messages: string[];
  data: T;
  error: string | null;
}

/** Thrown by the API client for any non-2xx response. */
export class ApiError extends Error {
  statusCode: number;
  messages: string[];

  constructor(statusCode: number, messages: string[]) {
    super(messages[0] ?? 'خطایی رخ داده است.');
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.messages = messages;
  }
}

/**
 * Shape of the `pagination` block every `getAll` endpoint returns
 * (users, projects, and any future list endpoint that follows the same
 * `skip/take` + count pattern on the backend).
 */
export interface Pagination {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

/** Matches the `{ list, pagination }` payload nested inside `ApiResponse<T>.data` for list endpoints. */
export interface PaginatedResult<T> {
  list: T[];
  pagination: Pagination;
}
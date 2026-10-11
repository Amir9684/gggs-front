/**
 * Mirrors `Report` entity on the backend. `filePath` is a server-side
 * absolute path (under `REPORTS_STORAGE_DIR`) — it's only meaningful to
 * the backend and is never used to build a URL client-side; downloading
 * always goes through `GET /reports/:id/download` instead.
 */
export interface Report {
  id: string;
  name: string;
  filePath: string;
  project?: { id: string; name: string } | null;
  result?: { id: string } | null;
  createdAt: string;
  updatedAt: string;
}
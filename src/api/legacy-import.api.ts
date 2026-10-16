import { apiClient } from "../lib/api-client";
import type { LegacyImport } from "../types/legacy";

export const legacyImportApi = {
  /**
   * Reads a Windows `.gggs` file on the server and returns its contents for
   * review. Nothing is saved — the grid is created afterwards through the
   * normal grid endpoints.
   */
  parseGggs: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm<LegacyImport>("/legacy-import/gggs/parse", form);
  },
};

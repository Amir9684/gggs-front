/** Mirrors `SoilLayer` entity on the backend. Layers are ordered top-down via `layerOrder`. */
export interface SoilLayer {
  id: string;
  layerOrder: number;
  resistivity: number;
  thickness: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors `SoilModel` entity on the backend. `getAll` only
 * `leftJoinAndSelect`s `project`, not `layers` — so list rows come back
 * without `layers` at all. `getOne`/`create`/`update` return the full
 * model with `layers` populated. Treat `layers` as possibly absent
 * anywhere a `SoilModel` might have come from the list endpoint.
 */
export interface SoilModel {
  id: string;
  name: string;
  surfaceResistivity: number;
  project?: { id: string; name: string } | null;
  layers?: SoilLayer[];
  createdAt: string;
  updatedAt: string;
}
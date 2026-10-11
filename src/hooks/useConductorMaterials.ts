import { useEffect, useState } from "react";

import { conductorsApi } from "../api/conductors.api";
import { ApiError } from "../types/api";
import type {
  ConductorMaterial,
  ConductorMaterialInfo,
  ConductorMaterialsResponse,
} from "../types/conductor";

/**
 * The catalog never changes while the app is open, so it is fetched once
 * and shared by every component that needs it (the case form, the case
 * detail page and the grid editor's properties panel). A failed request is
 * not cached, so the next mount tries again.
 */
let catalogRequest: Promise<ConductorMaterialsResponse> | null = null;

function loadCatalog(): Promise<ConductorMaterialsResponse> {
  if (!catalogRequest) {
    catalogRequest = conductorsApi.getMaterials().catch((err: unknown) => {
      catalogRequest = null;
      throw err;
    });
  }
  return catalogRequest;
}

interface CatalogState {
  materials: ConductorMaterialInfo[];
  standardSizesMm2: number[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: CatalogState = {
  materials: [],
  standardSizesMm2: [],
  isLoading: true,
  error: null,
};

export function useConductorMaterials() {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setState({
          materials: catalog.materials,
          standardSizesMm2: catalog.standardSizesMm2,
          isLoading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          materials: [],
          standardSizesMm2: [],
          isLoading: false,
          error:
            err instanceof ApiError
              ? err.messages[0]
              : "دریافت فهرست جنس هادی‌ها ناموفق بود.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const findMaterial = (id: ConductorMaterial | string | undefined) =>
    state.materials.find((material) => material.id === id);

  return { ...state, findMaterial };
}

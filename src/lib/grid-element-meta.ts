import { ConductorMaterial } from "../types/conductor";
import { GridElementType } from "../types/grid";

/**
 * Distinguishing colors per element type. Deliberately a separate small
 * palette from the app's copper/danger/success theme tokens — seven
 * element types need to stay visually distinct on the canvas at a glance,
 * which the theme's limited palette isn't built for. CONDUCTOR keeps the
 * theme's copper tone since it's literally the copper wire.
 */
export const GRID_ELEMENT_COLORS: Record<GridElementType, string> = {
  [GridElementType.CONDUCTOR]: "#c97a45",
  [GridElementType.ROD]: "#e0b04f",
  [GridElementType.WELL]: "#4fa8ae",
  [GridElementType.FENCE]: "#8fa0a8",
  [GridElementType.EQUIPMENT]: "#a988e0",
  [GridElementType.BUILDING]: "#5c7a8c",
  [GridElementType.GATE]: "#e5484d",
};

export const GRID_ELEMENT_GEOMETRY_KIND: Record<
  GridElementType,
  "Point" | "LineString" | "Polygon"
> = {
  [GridElementType.CONDUCTOR]: "LineString",
  [GridElementType.ROD]: "Point",
  [GridElementType.WELL]: "Point",
  [GridElementType.FENCE]: "LineString",
  [GridElementType.EQUIPMENT]: "Point",
  [GridElementType.BUILDING]: "Polygon",
  [GridElementType.GATE]: "Point",
};

/** Sensible starting `properties` for a freshly-drawn element, editable afterward in the properties panel. */
export function defaultPropertiesFor(
  type: GridElementType,
): Record<string, unknown> {
  switch (type) {
    case GridElementType.CONDUCTOR:
      // The material is a `ConductorMaterial` id from the backend catalog
      // (`GET /conductors/materials`), the same list the case form uses.
      return {
        material: ConductorMaterial.COPPER_ANNEALED_SOFT_DRAWN,
        crossSectionMm2: 70,
      };
    case GridElementType.ROD:
      return { lengthM: 3, diameterMm: 16 };
    case GridElementType.WELL:
      return { depthM: 1.5 };
    case GridElementType.FENCE:
      return { heightM: 2 };
    case GridElementType.EQUIPMENT:
      return { label: "" };
    case GridElementType.BUILDING:
      return { label: "" };
    case GridElementType.GATE:
      return { widthM: 3 };
    default:
      return {};
  }
}

export const MIN_POINTS_FOR_TYPE: Record<GridElementType, number> = {
  [GridElementType.CONDUCTOR]: 2,
  [GridElementType.ROD]: 1,
  [GridElementType.WELL]: 1,
  [GridElementType.FENCE]: 2,
  [GridElementType.EQUIPMENT]: 1,
  [GridElementType.BUILDING]: 3,
  [GridElementType.GATE]: 1,
};
import { ConductorMaterial } from "../types/conductor";
import { GridElementType, type Geometry } from "../types/grid";

/**
 * Parametric grid generator — the web counterpart of the Windows
 * "Autoform" dialog. From a handful of numbers it produces the conductors
 * (named H1..Hn / V1..Vn like Windows) and ground rods of a regular grid,
 * ready to be saved with the bulk endpoint.
 *
 * Pure functions only (no React, no network) so the rules can be checked
 * on their own.
 */

export type GeneratorShape = "rectangle" | "square" | "l-shape";

/** Say how many lines to draw, or how far apart they should be. */
export type LineMode = "count" | "spacing";

export type RodArrangement = "none" | "corners" | "perimeter" | "intersections";

export interface GeneratorParams {
  shape: GeneratorShape;
  /** Plan length along X (m). For a square this is the side. */
  length: number;
  /** Plan width along Y (m). Ignored for a square (equals `length`). */
  width: number;
  /** L-shape: size of the corner cut away at the far (max X, max Y) corner. */
  notchLength: number;
  notchWidth: number;

  lineMode: LineMode;
  /** H lines: conductors running along X, one per Y position. */
  horizontalLines: number;
  /** V lines: conductors running along Y, one per X position. */
  verticalLines: number;
  /** Distance between neighbouring H lines (m), `spacing` mode. */
  horizontalSpacing: number;
  /** Distance between neighbouring V lines (m), `spacing` mode. */
  verticalSpacing: number;

  burialDepth: number;

  rodArrangement: RodArrangement;
  /** Number of rods spread along the outline, `perimeter` arrangement. */
  perimeterRodCount: number;
  rodLengthM: number;
  rodDiameterMm: number;

  material: ConductorMaterial;
  crossSectionMm2: number;
}

export const DEFAULT_GENERATOR_PARAMS: GeneratorParams = {
  shape: "rectangle",
  length: 60,
  width: 40,
  notchLength: 20,
  notchWidth: 15,
  lineMode: "count",
  horizontalLines: 5,
  verticalLines: 7,
  horizontalSpacing: 10,
  verticalSpacing: 10,
  burialDepth: 0.5,
  rodArrangement: "corners",
  perimeterRodCount: 8,
  rodLengthM: 3,
  rodDiameterMm: 16,
  material: ConductorMaterial.COPPER_ANNEALED_SOFT_DRAWN,
  crossSectionMm2: 70,
};

/** Same ceiling as the backend's bulk save (`MAX_BULK_ELEMENTS`). */
export const MAX_GENERATED_ELEMENTS = 5000;
const MAX_LINES_PER_DIRECTION = 200;

export interface GeneratedElement {
  type: GridElementType;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

export interface GeneratorSummary {
  horizontalLines: number;
  verticalLines: number;
  rodCount: number;
  /** Total length of all conductors (m). */
  conductorLength: number;
  /** Actual distance between H lines / V lines (m); 0 when only one line. */
  horizontalSpacing: number;
  verticalSpacing: number;
}

export interface GeneratedGrid {
  dimensions: { length: number; width: number; burialDepth: number };
  elements: GeneratedElement[];
  summary: GeneratorSummary;
  /** Outline of the grid, for drawing a preview. */
  outline: [number, number][];
}

export type GeneratorErrors = Partial<Record<keyof GeneratorParams, string>>;

const EPS = 1e-6;

const round = (value: number): number => Math.round(value * 1e4) / 1e4;

const isPositive = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

/** Plan size after applying the square rule. */
function plan(params: GeneratorParams): { length: number; width: number } {
  return {
    length: params.length,
    width: params.shape === "square" ? params.length : params.width,
  };
}

/** Line counts after resolving `spacing` mode (the last gap may be shorter). */
export function resolveLineCounts(params: GeneratorParams): {
  horizontal: number;
  vertical: number;
} {
  if (params.lineMode === "count") {
    return {
      horizontal: params.horizontalLines,
      vertical: params.verticalLines,
    };
  }
  const { length, width } = plan(params);
  return {
    horizontal: Math.round(width / params.horizontalSpacing) + 1,
    vertical: Math.round(length / params.verticalSpacing) + 1,
  };
}

/** Checks the inputs. An empty result means `generateGrid` can run. */
export function validateGeneratorParams(
  params: GeneratorParams,
): GeneratorErrors {
  const errors: GeneratorErrors = {};
  const { length, width } = plan(params);

  if (!isPositive(params.length)) errors.length = "طول باید مثبت باشد.";
  if (params.shape !== "square" && !isPositive(params.width)) {
    errors.width = "عرض باید مثبت باشد.";
  }
  if (!isPositive(params.burialDepth)) {
    errors.burialDepth = "عمق دفن باید مثبت باشد.";
  }

  if (params.shape === "l-shape") {
    if (!(params.notchLength > 0 && params.notchLength < length)) {
      errors.notchLength = "طول بریدگی باید بین صفر و طول شبکه باشد.";
    }
    if (!(params.notchWidth > 0 && params.notchWidth < width)) {
      errors.notchWidth = "عرض بریدگی باید بین صفر و عرض شبکه باشد.";
    }
  }

  if (params.lineMode === "count") {
    for (const key of ["horizontalLines", "verticalLines"] as const) {
      const n = params[key];
      if (
        !Number.isInteger(n) ||
        n < 2 ||
        n > MAX_LINES_PER_DIRECTION
      ) {
        errors[key] = `تعداد باید عددی صحیح بین ۲ و ${MAX_LINES_PER_DIRECTION} باشد.`;
      }
    }
  } else {
    if (!isPositive(params.horizontalSpacing) || params.horizontalSpacing > width) {
      errors.horizontalSpacing = "فاصله باید مثبت و حداکثر برابر عرض شبکه باشد.";
    }
    if (!isPositive(params.verticalSpacing) || params.verticalSpacing > length) {
      errors.verticalSpacing = "فاصله باید مثبت و حداکثر برابر طول شبکه باشد.";
    }
  }

  if (!isPositive(params.crossSectionMm2)) {
    errors.crossSectionMm2 = "سطح مقطع باید مثبت باشد.";
  }

  if (params.rodArrangement !== "none") {
    if (!isPositive(params.rodLengthM)) {
      errors.rodLengthM = "طول میله باید مثبت باشد.";
    }
    if (!isPositive(params.rodDiameterMm)) {
      errors.rodDiameterMm = "قطر میله باید مثبت باشد.";
    }
  }
  if (
    params.rodArrangement === "perimeter" &&
    (!Number.isInteger(params.perimeterRodCount) ||
      params.perimeterRodCount < 1)
  ) {
    errors.perimeterRodCount = "تعداد میله باید عددی صحیح و حداقل یک باشد.";
  }

  // Only meaningful once the numbers above are usable.
  if (Object.keys(errors).length === 0) {
    const count = estimateElementCount(params);
    if (count > MAX_GENERATED_ELEMENTS) {
      errors.rodArrangement = `تعداد المان‌ها (${count}) از حد مجاز ${MAX_GENERATED_ELEMENTS} بیشتر است.`;
    }
  }

  return errors;
}

function estimateElementCount(params: GeneratorParams): number {
  const { horizontal, vertical } = resolveLineCounts(params);
  const rods =
    params.rodArrangement === "intersections"
      ? horizontal * vertical
      : params.rodArrangement === "perimeter"
        ? params.perimeterRodCount
        : params.rodArrangement === "corners"
          ? 6
          : 0;
  return horizontal + vertical + 2 + rods;
}

/** `count` evenly spaced values from 0 to `extent`, both ends included. */
function linspace(extent: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    round((extent * i) / (count - 1)),
  );
}

/** Inserts `value` into the sorted list unless it is already (nearly) there. */
function withValue(values: number[], value: number): number[] {
  if (values.some((v) => Math.abs(v - value) < EPS)) return values;
  return [...values, value].sort((a, b) => a - b);
}

function outlineOf(
  params: GeneratorParams,
  length: number,
  width: number,
): [number, number][] {
  if (params.shape !== "l-shape") {
    return [
      [0, 0],
      [length, 0],
      [length, width],
      [0, width],
    ];
  }
  const xEdge = round(length - params.notchLength);
  const yEdge = round(width - params.notchWidth);
  return [
    [0, 0],
    [length, 0],
    [length, yEdge],
    [xEdge, yEdge],
    [xEdge, width],
    [0, width],
  ];
}

/** `count` points spread evenly (by distance) along the closed outline. */
function alongOutline(
  outline: [number, number][],
  count: number,
): [number, number][] {
  const edges = outline.map((from, i) => {
    const to = outline[(i + 1) % outline.length];
    return { from, to, length: Math.hypot(to[0] - from[0], to[1] - from[1]) };
  });
  const perimeter = edges.reduce((sum, e) => sum + e.length, 0);

  return Array.from({ length: count }, (_, k) => {
    let distance = (perimeter * k) / count;
    for (const edge of edges) {
      if (distance <= edge.length + EPS) {
        const t = edge.length === 0 ? 0 : distance / edge.length;
        return [
          round(edge.from[0] + (edge.to[0] - edge.from[0]) * t),
          round(edge.from[1] + (edge.to[1] - edge.from[1]) * t),
        ] as [number, number];
      }
      distance -= edge.length;
    }
    return outline[0];
  });
}

/**
 * Builds the grid. Call `validateGeneratorParams` first — invalid numbers
 * give meaningless output.
 *
 * For an L-shape the corner at (max X, max Y) is cut away. Conductors are
 * also placed on the two inner edges of the cut, so the outline is closed
 * even if the regular line positions miss them; the summary reports the
 * resulting line counts.
 */
export function generateGrid(params: GeneratorParams): GeneratedGrid {
  const { length, width } = plan(params);
  const counts = resolveLineCounts(params);
  const isL = params.shape === "l-shape";
  const xEdge = isL ? round(length - params.notchLength) : length;
  const yEdge = isL ? round(width - params.notchWidth) : width;

  let ys = linspace(width, counts.horizontal);
  let xs = linspace(length, counts.vertical);
  if (isL) {
    ys = withValue(ys, yEdge);
    xs = withValue(xs, xEdge);
  }

  /** Right end of the H line at `y`. */
  const xMaxAt = (y: number) => (isL && y > yEdge + EPS ? xEdge : length);
  /** Top end of the V line at `x`. */
  const yMaxAt = (x: number) => (isL && x > xEdge + EPS ? yEdge : width);

  const conductorProperties = {
    material: params.material,
    crossSectionMm2: params.crossSectionMm2,
  };

  const elements: GeneratedElement[] = [];
  let conductorLength = 0;

  ys.forEach((y, i) => {
    const end = xMaxAt(y);
    conductorLength += end;
    elements.push({
      type: GridElementType.CONDUCTOR,
      geometry: {
        type: "LineString",
        coordinates: [
          [0, y],
          [end, y],
        ],
      },
      properties: { ...conductorProperties, name: `H${i + 1}` },
    });
  });

  xs.forEach((x, i) => {
    const end = yMaxAt(x);
    conductorLength += end;
    elements.push({
      type: GridElementType.CONDUCTOR,
      geometry: {
        type: "LineString",
        coordinates: [
          [x, 0],
          [x, end],
        ],
      },
      properties: { ...conductorProperties, name: `V${i + 1}` },
    });
  });

  const outline = outlineOf(params, length, width);

  let rodPoints: [number, number][] = [];
  if (params.rodArrangement === "corners") {
    rodPoints = outline;
  } else if (params.rodArrangement === "perimeter") {
    rodPoints = alongOutline(outline, params.perimeterRodCount);
  } else if (params.rodArrangement === "intersections") {
    for (const y of ys) {
      for (const x of xs) {
        if (x <= xMaxAt(y) + EPS && y <= yMaxAt(x) + EPS) {
          rodPoints.push([x, y]);
        }
      }
    }
  }

  for (const point of rodPoints) {
    elements.push({
      type: GridElementType.ROD,
      geometry: { type: "Point", coordinates: point },
      properties: {
        lengthM: params.rodLengthM,
        diameterMm: params.rodDiameterMm,
      },
    });
  }

  return {
    dimensions: {
      length,
      width,
      burialDepth: params.burialDepth,
    },
    elements,
    outline,
    summary: {
      horizontalLines: ys.length,
      verticalLines: xs.length,
      rodCount: rodPoints.length,
      conductorLength: round(conductorLength),
      horizontalSpacing: ys.length > 1 ? round(width / (ys.length - 1)) : 0,
      verticalSpacing: xs.length > 1 ? round(length / (xs.length - 1)) : 0,
    },
  };
}

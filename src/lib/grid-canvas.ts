import type {
  Geometry,
  LineStringGeometry,
  PointGeometry,
  PolygonGeometry,
  Position,
} from "../types/grid";

export type MeterPoint = [number, number];

/** Maps the grid's local meter plane to SVG pixel space (no rotation). */
export interface Viewport {
  /** Pixels per meter. */
  scale: number;
  /** Pixel offset of world coordinate (0, 0). */
  offsetX: number;
  offsetY: number;
}

export function toScreen(view: Viewport, [x, y]: MeterPoint): MeterPoint {
  return [view.offsetX + x * view.scale, view.offsetY + y * view.scale];
}

export function toWorld(view: Viewport, [x, y]: MeterPoint): MeterPoint {
  return [(x - view.offsetX) / view.scale, (y - view.offsetY) / view.scale];
}

export function snapMeter(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function snapPoint(
  point: MeterPoint,
  step: number,
  enabled: boolean,
): MeterPoint {
  if (!enabled) return point;
  return [snapMeter(point[0], step), snapMeter(point[1], step)];
}

/**
 * Fits a `gridLength` × `gridWidth` (meters) rectangle into a
 * `containerWidthPx` × `containerHeightPx` viewport, centered, with padding.
 */
export function fitViewport(
  gridLength: number,
  gridWidth: number,
  containerWidthPx: number,
  containerHeightPx: number,
  paddingPx = 48,
): Viewport {
  const usableW = Math.max(containerWidthPx - paddingPx * 2, 10);
  const usableH = Math.max(containerHeightPx - paddingPx * 2, 10);
  const scale = Math.max(
    Math.min(
      usableW / Math.max(gridLength, 1),
      usableH / Math.max(gridWidth, 1),
    ),
    0.5,
  );
  const offsetX = (containerWidthPx - gridLength * scale) / 2;
  const offsetY = (containerHeightPx - gridWidth * scale) / 2;
  return { scale, offsetX, offsetY };
}

function toPoints(coords: Position[]): MeterPoint[] {
  return coords.map(([x, y]) => [x, y]);
}

export function pointGeometry(point: MeterPoint): PointGeometry {
  return { type: "Point", coordinates: [point[0], point[1]] };
}

export function lineGeometry(points: MeterPoint[]): LineStringGeometry {
  return { type: "LineString", coordinates: points.map(([x, y]) => [x, y]) };
}

/** Closes the ring (first point repeated at the end), as GeoJSON Polygon rings require. */
export function polygonGeometry(points: MeterPoint[]): PolygonGeometry {
  const ring = points.map(([x, y]) => [x, y] as Position);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed =
    first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
  return { type: "Polygon", coordinates: [closed] };
}

/** All vertices of a geometry, in meters. For polygons this includes the closing duplicate. */
export function geometryPoints(geometry: Geometry): MeterPoint[] {
  if (geometry.type === "Point") {
    return [[geometry.coordinates[0], geometry.coordinates[1]]];
  }
  if (geometry.type === "LineString") {
    return toPoints(geometry.coordinates);
  }
  return toPoints(geometry.coordinates[0]);
}

/** Vertices meant to have a draggable handle — polygons drop the duplicated closing point. */
export function handlePoints(geometry: Geometry): MeterPoint[] {
  const points = geometryPoints(geometry);
  if (geometry.type === "Polygon" && points.length > 1) {
    return points.slice(0, -1);
  }
  return points;
}

export function translateGeometry(
  geometry: Geometry,
  dx: number,
  dy: number,
): Geometry {
  if (geometry.type === "Point") {
    return pointGeometry([
      geometry.coordinates[0] + dx,
      geometry.coordinates[1] + dy,
    ]);
  }
  if (geometry.type === "LineString") {
    return {
      type: "LineString",
      coordinates: geometry.coordinates.map(([x, y]) => [x + dx, y + dy]),
    };
  }
  return {
    type: "Polygon",
    coordinates: geometry.coordinates.map((ring) =>
      ring.map(([x, y]) => [x + dx, y + dy]),
    ),
  };
}

/**
 * Moves a single vertex by index. For polygons, index refers to the
 * (deduplicated) handle list from `handlePoints` — moving the shared
 * first/last vertex keeps the ring closed.
 */
export function moveVertex(
  geometry: Geometry,
  index: number,
  point: MeterPoint,
): Geometry {
  if (geometry.type === "Point") {
    return pointGeometry(point);
  }

  if (geometry.type === "LineString") {
    const coords = geometry.coordinates.slice();
    coords[index] = [point[0], point[1]];
    return { type: "LineString", coordinates: coords };
  }

  const ring = geometry.coordinates[0].slice();
  ring[index] = [point[0], point[1]];
  if (index === 0) {
    ring[ring.length - 1] = [point[0], point[1]];
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function distance(a: MeterPoint, b: MeterPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Total length (meters) of a LineString's segments. */
export function lineLength(points: MeterPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

/** Polygon area (m²) via the shoelace formula; `ring` should be closed. */
export function polygonArea(ring: MeterPoint[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
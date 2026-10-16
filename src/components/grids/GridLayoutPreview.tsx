import { GRID_ELEMENT_COLORS } from "../../lib/grid-element-meta";
import { GridElementType, type Geometry } from "../../types/grid";

interface GridLayoutPreviewProps {
  length: number;
  width: number;
  /** Corners of the grid outline, drawn dashed behind the elements. */
  outline?: [number, number][];
  elements: { type: GridElementType; geometry: Geometry }[];
}

const SIZE = 280;
const PAD = 14;

/**
 * Small read-only drawing of a grid layout (conductors and rods), used to
 * check a generated or imported grid before it is applied.
 */
export function GridLayoutPreview({
  length,
  width,
  outline,
  elements,
}: GridLayoutPreviewProps) {
  const scale = Math.min(
    (SIZE - 2 * PAD) / Math.max(length, 1e-6),
    (SIZE - 2 * PAD) / Math.max(width, 1e-6),
  );
  // Y grows downward, like the editor canvas.
  const x = (v: number) => PAD + v * scale;
  const y = (v: number) => PAD + v * scale;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-70 w-full rounded-lg border border-border-soft bg-bg"
      role="img"
      aria-label="پیش‌نمایش شبکه"
    >
      {outline && (
        <polygon
          points={outline.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")}
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
      )}
      {elements.map((element, index) => {
        const color = GRID_ELEMENT_COLORS[element.type];
        if (element.geometry.type === "LineString") {
          const points = element.geometry.coordinates;
          return (
            <polyline
              key={index}
              points={points.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
            />
          );
        }
        if (element.geometry.type === "Point") {
          const [px, py] = element.geometry.coordinates;
          return (
            <circle
              key={index}
              cx={x(px)}
              cy={y(py)}
              r={element.type === GridElementType.WELL ? 4.5 : 3.5}
              fill={color}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

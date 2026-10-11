import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { gridElementsApi } from "../../../api/grid-elements.api";
import { ApiError } from "../../../types/api";
import {
  GridElementType,
  type Geometry,
  type Grid,
  type GridElement,
} from "../../../types/grid";
import {
  GRID_ELEMENT_COLORS,
  GRID_ELEMENT_GEOMETRY_KIND,
  MIN_POINTS_FOR_TYPE,
  defaultPropertiesFor,
} from "../../../lib/grid-element-meta";
import {
  clamp,
  fitViewport,
  handlePoints,
  lineGeometry,
  moveVertex,
  pointGeometry,
  polygonGeometry,
  snapPoint,
  toWorld,
  translateGeometry,
  type MeterPoint,
  type Viewport,
} from "../../../lib/grid-canvas";
import { GridElementToolbar } from "./GridElementToolbar";
import {
  GridElementPropertiesPanel,
  type SelectedElementSummary,
} from "./GridElementPropertiesPanel";
import { GridSnapshotsPanel } from "./GridSnapshotsPanel";

export type CanvasTool = "select" | GridElementType;

interface EditableElement {
  clientId: string;
  /** Server id, or `null` for an element drawn locally but not yet saved. */
  id: string | null;
  type: GridElementType;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

function fromServer(element: GridElement): EditableElement {
  return {
    clientId: element.id,
    id: element.id,
    type: element.type,
    geometry: element.geometry,
    properties: element.properties ?? {},
  };
}

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(36).slice(2)}`;
}

const SNAP_STEP = 0.5;
const MIN_SCALE = 4;
const MAX_SCALE = 200;

type DragState =
  | { kind: "pan"; startScreen: MeterPoint; startView: Viewport }
  | { kind: "point"; clientId: string }
  | { kind: "vertex"; clientId: string; index: number }
  | { kind: "shape"; clientId: string; lastWorld: MeterPoint }
  | null;

interface GridCanvasProps {
  grid: Grid;
  /** Reviewers can pan/zoom/inspect but not draw, move, delete, or save. */
  readOnly?: boolean;
}

export function GridCanvas({ grid, readOnly = false }: GridCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState>(null);

  const [elements, setElements] = useState<EditableElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [tool, setTool] = useState<CanvasTool>("select");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<MeterPoint[]>([]);
  const [cursorWorld, setCursorWorld] = useState<MeterPoint | null>(null);

  const [view, setView] = useState<Viewport>({ scale: 20, offsetX: 0, offsetY: 0 });

  // --- load elements -----------------------------------------------------

  const fetchElements = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await gridElementsApi.getAll({ gridId: grid.id });
      setElements(list.map(fromServer));
      setIsDirty(false);
      setSelectedClientId(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.messages[0]
          : "دریافت المان‌های شبکه ناموفق بود.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [grid.id]);

  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  // --- fit viewport to the container on mount / resize --------------------

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setView(
      fitViewport(grid.length, grid.width, el.clientWidth, el.clientHeight),
    );
  }, [grid.length, grid.width]);

  useEffect(() => {
    fitToContainer();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitToContainer());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToContainer]);

  // --- selection -----------------------------------------------------

  const selectedElement = useMemo(
    () => elements.find((e) => e.clientId === selectedClientId) ?? null,
    [elements, selectedClientId],
  );

  const selectedSummary: SelectedElementSummary | null = selectedElement
    ? {
        clientId: selectedElement.clientId,
        type: selectedElement.type,
        geometry: selectedElement.geometry,
        properties: selectedElement.properties,
        isNew: selectedElement.id === null,
      }
    : null;

  // --- mutations -----------------------------------------------------

  const updateElement = useCallback(
    (clientId: string, updater: (el: EditableElement) => EditableElement) => {
      setElements((prev) =>
        prev.map((e) => (e.clientId === clientId ? updater(e) : e)),
      );
      setIsDirty(true);
    },
    [],
  );

  const addElement = useCallback((type: GridElementType, geometry: Geometry) => {
    const clientId = newClientId();
    setElements((prev) => [
      ...prev,
      { clientId, id: null, type, geometry, properties: defaultPropertiesFor(type) },
    ]);
    setIsDirty(true);
    setSelectedClientId(clientId);
  }, []);

  const deleteElement = useCallback((clientId: string) => {
    setElements((prev) => prev.filter((e) => e.clientId !== clientId));
    setIsDirty(true);
    setSelectedClientId((current) => (current === clientId ? null : current));
  }, []);

  const handleChangeProperties = useCallback(
    (clientId: string, properties: Record<string, unknown>) => {
      updateElement(clientId, (el) => ({ ...el, properties }));
    },
    [updateElement],
  );

  // --- coordinate helper -----------------------------------------------------

  const eventToWorld = useCallback(
    (e: { clientX: number; clientY: number }): MeterPoint => {
      const svg = svgRef.current;
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      return toWorld(view, [e.clientX - rect.left, e.clientY - rect.top]);
    },
    [view],
  );

  // --- draft (in-progress line/polygon) -----------------------------------------------------

  const finishDraft = useCallback(() => {
    if (typeof tool !== "number") return;
    const kind = GRID_ELEMENT_GEOMETRY_KIND[tool];
    const min = MIN_POINTS_FOR_TYPE[tool];
    if (draftPoints.length < min) return;
    const geometry =
      kind === "LineString"
        ? lineGeometry(draftPoints)
        : polygonGeometry(draftPoints);
    addElement(tool, geometry);
    setDraftPoints([]);
  }, [tool, draftPoints, addElement]);

  const cancelDraft = useCallback(() => setDraftPoints([]), []);

  const changeTool = useCallback((next: CanvasTool) => {
    setDraftPoints([]);
    setSelectedClientId(null);
    setTool(next);
  }, []);

  // --- keyboard shortcuts -----------------------------------------------------

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isTyping) return;

      if (e.key === "Escape") {
        cancelDraft();
        setSelectedClientId(null);
        setTool("select");
      } else if (e.key === "Enter") {
        finishDraft();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedClientId) {
        e.preventDefault();
        deleteElement(selectedClientId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly, cancelDraft, finishDraft, selectedClientId, deleteElement]);

  // --- pointer interactions -----------------------------------------------------

  const handleBackgroundPointerDown = (
    e: ReactPointerEvent<SVGSVGElement>,
  ) => {
    if ((e.target as Element).closest("[data-canvas-hit]")) return;

    if (readOnly || tool === "select") {
      dragStateRef.current = {
        kind: "pan",
        startScreen: [e.clientX, e.clientY],
        startView: view,
      };
      setSelectedClientId(null);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    const world = eventToWorld(e);
    const snapped = snapPoint(world, SNAP_STEP, snapEnabled);
    const kind = GRID_ELEMENT_GEOMETRY_KIND[tool];

    if (kind === "Point") {
      addElement(tool, pointGeometry(snapped));
      return;
    }
    setDraftPoints((prev) => [...prev, snapped]);
  };

  const startElementDrag = (
    e: ReactPointerEvent,
    element: EditableElement,
  ) => {
    if (readOnly || tool !== "select") return;
    e.stopPropagation();
    setSelectedClientId(element.clientId);
    const world = eventToWorld(e);
    dragStateRef.current =
      element.geometry.type === "Point"
        ? { kind: "point", clientId: element.clientId }
        : { kind: "shape", clientId: element.clientId, lastWorld: world };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const startVertexDrag = (
    e: ReactPointerEvent,
    clientId: string,
    index: number,
  ) => {
    if (readOnly || tool !== "select") return;
    e.stopPropagation();
    setSelectedClientId(clientId);
    dragStateRef.current = { kind: "vertex", clientId, index };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const world = eventToWorld(e);
    setCursorWorld(world);

    const drag = dragStateRef.current;
    if (!drag) return;

    if (drag.kind === "pan") {
      const dx = e.clientX - drag.startScreen[0];
      const dy = e.clientY - drag.startScreen[1];
      setView({
        ...drag.startView,
        offsetX: drag.startView.offsetX + dx,
        offsetY: drag.startView.offsetY + dy,
      });
      return;
    }

    const snapped = snapPoint(world, SNAP_STEP, snapEnabled);

    if (drag.kind === "point") {
      updateElement(drag.clientId, (el) => ({
        ...el,
        geometry: pointGeometry(snapped),
      }));
    } else if (drag.kind === "vertex") {
      updateElement(drag.clientId, (el) => ({
        ...el,
        geometry: moveVertex(el.geometry, drag.index, snapped),
      }));
    } else if (drag.kind === "shape") {
      const dx = world[0] - drag.lastWorld[0];
      const dy = world[1] - drag.lastWorld[1];
      updateElement(drag.clientId, (el) => ({
        ...el,
        geometry: translateGeometry(el.geometry, dx, dy),
      }));
      dragStateRef.current = { ...drag, lastWorld: world };
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragStateRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* wasn't captured on this target — nothing to release */
    }
  };

  const handleWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const screen: MeterPoint = [e.clientX - rect.left, e.clientY - rect.top];
    zoomAt(screen, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  const zoomAt = (screen: MeterPoint, factor: number) => {
    setView((current) => {
      const worldBefore = toWorld(current, screen);
      const newScale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      return {
        scale: newScale,
        offsetX: screen[0] - worldBefore[0] * newScale,
        offsetY: screen[1] - worldBefore[1] * newScale,
      };
    });
  };

  const zoomButton = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    zoomAt([el.clientWidth / 2, el.clientHeight / 2], factor);
  };

  // --- save -----------------------------------------------------

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await gridElementsApi.saveBulk({
        gridId: grid.id,
        elements: elements.map((e) => ({
          type: e.type,
          geometry: e.geometry,
          properties: e.properties,
        })),
      });
      setElements(saved.map(fromServer));
      setIsDirty(false);
      setSelectedClientId(null);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.messages[0] : "ذخیرهٔ تغییرات ناموفق بود.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    fetchElements();
  };

  const handleRestored = (restored: GridElement[]) => {
    setElements(restored.map(fromServer));
    setIsDirty(false);
    setSelectedClientId(null);
    setDraftPoints([]);
  };

  // --- geometry → screen -----------------------------------------------------

  const toScreenStr = (points: MeterPoint[]) =>
    points
      .map(([x, y]) => `${view.offsetX + x * view.scale},${view.offsetY + y * view.scale}`)
      .join(" ");

  const gridLines = useMemo(() => {
    const step = grid.length > 60 || grid.width > 60 ? 5 : 1;
    const verticals: number[] = [];
    for (let x = 0; x <= grid.length + 1e-6; x += step) verticals.push(x);
    const horizontals: number[] = [];
    for (let y = 0; y <= grid.width + 1e-6; y += step) horizontals.push(y);
    return { verticals, horizontals };
  }, [grid.length, grid.width]);

  // --- render -----------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex h-[32rem] items-center justify-center rounded-xl border border-border-soft bg-surface">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-copper" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 px-5 py-6 text-sm text-danger">
        {loadError}
      </div>
    );
  }

  const canFinishDraft =
    tool !== "select" && draftPoints.length >= MIN_POINTS_FOR_TYPE[tool];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-3">
        {!readOnly && (
          <GridElementToolbar
            tool={tool}
            onToolChange={changeTool}
            snapEnabled={snapEnabled}
            onSnapChange={setSnapEnabled}
          />
        )}

        {readOnly && (
          <div className="rounded-lg border border-border-soft bg-surface px-3.5 py-2 text-xs text-text-muted">
            حالت فقط‌نمایش — به عنوان بازدید‌کننده امکان ویرایش شبکه وجود ندارد.
          </div>
        )}

        {saveError && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs text-danger">
            {saveError}
          </p>
        )}

        <div
          ref={containerRef}
          className="relative h-[32rem] overflow-hidden rounded-xl border border-border-soft"
          style={{ backgroundColor: "#101d15" }}
        >
          <svg
            ref={svgRef}
            className="h-full w-full touch-none"
            style={{ cursor: readOnly || tool === "select" ? "grab" : "crosshair" }}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onDoubleClick={finishDraft}
          >
            {/* grid boundary */}
            <rect
              x={view.offsetX}
              y={view.offsetY}
              width={grid.length * view.scale}
              height={grid.width * view.scale}
              fill="#16281d"
              stroke="#2c4a36"
              strokeWidth={1.5}
            />

            {/* meter gridlines */}
            {gridLines.verticals.map((x) => (
              <line
                key={`v${x}`}
                x1={view.offsetX + x * view.scale}
                y1={view.offsetY}
                x2={view.offsetX + x * view.scale}
                y2={view.offsetY + grid.width * view.scale}
                stroke="#25402f"
                strokeWidth={0.75}
              />
            ))}
            {gridLines.horizontals.map((y) => (
              <line
                key={`h${y}`}
                x1={view.offsetX}
                y1={view.offsetY + y * view.scale}
                x2={view.offsetX + grid.length * view.scale}
                y2={view.offsetY + y * view.scale}
                stroke="#25402f"
                strokeWidth={0.75}
              />
            ))}

            {/* saved / drawn elements */}
            {elements.map((el) => (
              <ElementShape
                key={el.clientId}
                element={el}
                view={view}
                selected={el.clientId === selectedClientId}
                readOnly={readOnly}
                onPointerDownElement={(e) => startElementDrag(e, el)}
                onPointerDownVertex={(e, index) =>
                  startVertexDrag(e, el.clientId, index)
                }
              />
            ))}

            {/* in-progress draft */}
            {draftPoints.length > 0 && typeof tool === "number" && (
              <g pointerEvents="none">
                {GRID_ELEMENT_GEOMETRY_KIND[tool] === "Polygon" &&
                draftPoints.length >= 2 ? (
                  <polygon
                    points={toScreenStr(
                      cursorWorld ? [...draftPoints, cursorWorld] : draftPoints,
                    )}
                    fill={`${GRID_ELEMENT_COLORS[tool]}22`}
                    stroke={GRID_ELEMENT_COLORS[tool]}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                  />
                ) : (
                  <polyline
                    points={toScreenStr(
                      cursorWorld ? [...draftPoints, cursorWorld] : draftPoints,
                    )}
                    fill="none"
                    stroke={GRID_ELEMENT_COLORS[tool]}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                  />
                )}
                {draftPoints.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={view.offsetX + x * view.scale}
                    cy={view.offsetY + y * view.scale}
                    r={3.5}
                    fill={GRID_ELEMENT_COLORS[tool]}
                  />
                ))}
              </g>
            )}
          </svg>

          {/* zoom controls */}
          <div className="absolute bottom-3 left-3 flex gap-1">
            <IconButton label="بزرگ‌نمایی" onClick={() => zoomButton(1.3)}>
              +
            </IconButton>
            <IconButton label="کوچک‌نمایی" onClick={() => zoomButton(1 / 1.3)}>
              −
            </IconButton>
            <IconButton label="متناسب با صفحه" onClick={fitToContainer}>
              ⤢
            </IconButton>
          </div>

          {/* coordinate readout */}
          {cursorWorld && (
            <div className="absolute bottom-3 right-3 rounded-md border border-border-soft bg-surface/90 px-2 py-1 font-mono text-[10px] tabular text-text-muted" dir="ltr">
              x: {cursorWorld[0].toFixed(2)}m · y: {cursorWorld[1].toFixed(2)}m
            </div>
          )}

          {/* drawing status bar */}
          {tool !== "select" && !readOnly && (
            <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border-soft bg-surface/95 px-3 py-1.5 text-xs text-text-muted shadow-lg">
              {draftPoints.length > 0 ? (
                <>
                  <span>{draftPoints.length} نقطه ثبت شد</span>
                  <button
                    type="button"
                    disabled={!canFinishDraft}
                    onClick={finishDraft}
                    className="rounded-md border border-copper/50 px-2 py-0.5 text-copper-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    پایان (Enter)
                  </button>
                  <button
                    type="button"
                    onClick={cancelDraft}
                    className="rounded-md border border-border px-2 py-0.5 hover:text-danger"
                  >
                    لغو (Esc)
                  </button>
                </>
              ) : (
                <span>روی نقشه کلیک کنید تا شروع شود</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <ElementLegend counts={countByType(elements)} />

          {!readOnly && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <>
                  <span className="text-xs text-copper-text">
                    تغییرات ذخیره‌نشده
                  </span>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isSaving}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    بازگشت به آخرین ذخیره
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="rounded-lg bg-copper px-4 py-2 text-xs font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "در حال ذخیره…" : "ذخیرهٔ تغییرات"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <GridElementPropertiesPanel
          selected={selectedSummary}
          readOnly={readOnly}
          onChangeProperties={handleChangeProperties}
          onDelete={deleteElement}
        />
        <GridSnapshotsPanel
          gridId={grid.id}
          hasUnsavedChanges={isDirty}
          readOnly={readOnly}
          onRestored={handleRestored}
        />
      </div>
    </div>
  );
}

function countByType(elements: EditableElement[]): Record<GridElementType, number> {
  const counts = {
    [GridElementType.CONDUCTOR]: 0,
    [GridElementType.ROD]: 0,
    [GridElementType.WELL]: 0,
    [GridElementType.FENCE]: 0,
    [GridElementType.EQUIPMENT]: 0,
    [GridElementType.BUILDING]: 0,
    [GridElementType.GATE]: 0,
  };
  for (const el of elements) counts[el.type] += 1;
  return counts;
}

function ElementLegend({ counts }: { counts: Record<GridElementType, number> }) {
  const entries = Object.keys(counts)
    .map((key) => Number(key) as GridElementType)
    .filter((type) => counts[type] > 0);

  if (entries.length === 0) {
    return <p className="text-xs text-text-faint">هنوز المانی رسم نشده است.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {entries.map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: GRID_ELEMENT_COLORS[type] }}
          />
          <span className="font-mono tabular">{counts[type]}</span>
        </span>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border-soft bg-surface/90 text-sm text-text-muted transition-colors hover:border-copper hover:text-copper-text"
    >
      {children}
    </button>
  );
}

function ElementShape({
  element,
  view,
  selected,
  readOnly,
  onPointerDownElement,
  onPointerDownVertex,
}: {
  element: EditableElement;
  view: Viewport;
  selected: boolean;
  readOnly: boolean;
  onPointerDownElement: (e: ReactPointerEvent) => void;
  onPointerDownVertex: (e: ReactPointerEvent, index: number) => void;
}) {
  const color = GRID_ELEMENT_COLORS[element.type];
  const toScreen1 = ([x, y]: MeterPoint): MeterPoint => [
    view.offsetX + x * view.scale,
    view.offsetY + y * view.scale,
  ];
  const toScreenStr = (points: MeterPoint[]) =>
    points.map((p) => toScreen1(p).join(",")).join(" ");

  const cursor = readOnly ? "default" : "pointer";

  if (element.geometry.type === "Point") {
    const [sx, sy] = toScreen1([
      element.geometry.coordinates[0],
      element.geometry.coordinates[1],
    ]);
    return (
      <g data-canvas-hit onPointerDown={onPointerDownElement} style={{ cursor }}>
        <circle cx={sx} cy={sy} r={12} fill="transparent" />
        <circle
          cx={sx}
          cy={sy}
          r={selected ? 6 : 4.5}
          fill={color}
          stroke={selected ? "#e8eef0" : "none"}
          strokeWidth={selected ? 1.5 : 0}
        />
      </g>
    );
  }

  const rawPoints =
    element.geometry.type === "LineString"
      ? element.geometry.coordinates.map(([x, y]) => [x, y] as MeterPoint)
      : element.geometry.coordinates[0].map(([x, y]) => [x, y] as MeterPoint);

  const Shape = element.geometry.type === "LineString" ? "polyline" : "polygon";

  return (
    <g style={{ cursor }}>
      {/* wide invisible hit area, easier to click/drag than the thin visible stroke */}
      <Shape
        data-canvas-hit
        onPointerDown={onPointerDownElement}
        points={toScreenStr(rawPoints)}
        fill={element.geometry.type === "Polygon" ? "transparent" : "none"}
        stroke="transparent"
        strokeWidth={14}
      />
      <Shape
        points={toScreenStr(rawPoints)}
        fill={element.geometry.type === "Polygon" ? `${color}22` : "none"}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeDasharray={element.type === GridElementType.FENCE ? "5 3" : undefined}
        pointerEvents="none"
      />
      {selected &&
        !readOnly &&
        handlePoints(element.geometry).map((p, i) => {
          const [hx, hy] = toScreen1(p);
          return (
            <circle
              key={i}
              data-canvas-hit
              cx={hx}
              cy={hy}
              r={5}
              fill="#e8eef0"
              stroke={color}
              strokeWidth={2}
              style={{ cursor: "move" }}
              onPointerDown={(e) => onPointerDownVertex(e, i)}
            />
          );
        })}
    </g>
  );
}
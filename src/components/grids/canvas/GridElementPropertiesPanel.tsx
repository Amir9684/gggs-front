import {
  GridElementType,
  GRID_ELEMENT_TYPE_LABELS_FA,
  type Geometry,
} from "../../../types/grid";
import {
  CONDUCTOR_MATERIALS,
  GRID_ELEMENT_COLORS,
} from "../../../lib/grid-element-meta";
import {
  geometryPoints,
  lineLength,
  polygonArea,
} from "../../../lib/grid-canvas";

export interface SelectedElementSummary {
  clientId: string;
  type: GridElementType;
  geometry: Geometry;
  properties: Record<string, unknown>;
  isNew: boolean;
}

interface GridElementPropertiesPanelProps {
  selected: SelectedElementSummary | null;
  readOnly: boolean;
  onChangeProperties: (
    clientId: string,
    properties: Record<string, unknown>,
  ) => void;
  onDelete: (clientId: string) => void;
}

export function GridElementPropertiesPanel({
  selected,
  readOnly,
  onChangeProperties,
  onDelete,
}: GridElementPropertiesPanelProps) {
  if (!selected) {
    return (
      <div className="rounded-xl border border-dashed border-border-soft bg-surface/60 p-4 text-xs text-text-faint">
        برای مشاهده و ویرایش مشخصات، یک المان را از روی نقشه انتخاب کنید.
      </div>
    );
  }

  const color = GRID_ELEMENT_COLORS[selected.type];
  const label = GRID_ELEMENT_TYPE_LABELS_FA[selected.type];

  const setField = (key: string, value: unknown) => {
    onChangeProperties(selected.clientId, {
      ...selected.properties,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-soft bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-sm font-bold text-text">{label}</h3>
          {selected.isNew && (
            <span className="rounded-full border border-copper/40 px-2 py-0.5 font-mono text-[10px] text-copper-text">
              ذخیره‌نشده
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onDelete(selected.clientId)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            حذف
          </button>
        )}
      </div>

      <GeometrySummary geometry={selected.geometry} />

      <div className="flex flex-col gap-3">
        <PropertyFields
          type={selected.type}
          properties={selected.properties}
          readOnly={readOnly}
          onChange={setField}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted">
            یادداشت
          </label>
          <textarea
            rows={2}
            disabled={readOnly}
            value={(selected.properties.note as string | undefined) ?? ""}
            onChange={(e) => setField("note", e.target.value)}
            className="resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-text-faint outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}

function GeometrySummary({ geometry }: { geometry: Geometry }) {
  if (geometry.type === "Point") {
    const [x, y] = geometry.coordinates;
    return (
      <p className="font-mono text-xs tabular text-text-muted" dir="ltr">
        x: {x.toFixed(2)}m · y: {y.toFixed(2)}m
      </p>
    );
  }
  const points = geometryPoints(geometry);
  if (geometry.type === "LineString") {
    return (
      <p className="font-mono text-xs tabular text-text-muted" dir="ltr">
        {points.length} نقطه · طول {lineLength(points).toFixed(2)}m
      </p>
    );
  }
  return (
    <p className="font-mono text-xs tabular text-text-muted" dir="ltr">
      {points.length - 1} ضلع · مساحت {polygonArea(points).toFixed(1)}m²
    </p>
  );
}

function PropertyFields({
  type,
  properties,
  readOnly,
  onChange,
}: {
  type: GridElementType;
  properties: Record<string, unknown>;
  readOnly: boolean;
  onChange: (key: string, value: unknown) => void;
}) {
  const numberField = (key: string, label: string, unit: string) => (
    <NumberField
      key={key}
      label={`${label} (${unit})`}
      value={properties[key] as number | undefined}
      readOnly={readOnly}
      onChange={(v) => onChange(key, v)}
    />
  );

  const textField = (key: string, label: string) => (
    <TextField
      key={key}
      label={label}
      value={properties[key] as string | undefined}
      readOnly={readOnly}
      onChange={(v) => onChange(key, v)}
    />
  );

  switch (type) {
    case GridElementType.CONDUCTOR:
      return (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              جنس هادی
            </label>
            <select
              disabled={readOnly}
              value={(properties.material as string) ?? CONDUCTOR_MATERIALS[0]}
              onChange={(e) => onChange("material", e.target.value)}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft disabled:opacity-60"
            >
              {CONDUCTOR_MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {numberField("crossSectionMm2", "سطح مقطع", "mm²")}
        </>
      );
    case GridElementType.ROD:
      return (
        <>
          {numberField("lengthM", "طول میله", "m")}
          {numberField("diameterMm", "قطر", "mm")}
        </>
      );
    case GridElementType.WELL:
      return numberField("depthM", "عمق چاه", "m");
    case GridElementType.FENCE:
      return numberField("heightM", "ارتفاع حصار", "m");
    case GridElementType.GATE:
      return numberField("widthM", "عرض دروازه", "m");
    case GridElementType.EQUIPMENT:
    case GridElementType.BUILDING:
      return textField("label", "برچسب");
    default:
      return null;
  }
}

function NumberField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: number | undefined;
  readOnly: boolean;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        disabled={readOnly}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        dir="ltr"
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-text-faint outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft disabled:opacity-60"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string | undefined;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <input
        type="text"
        disabled={readOnly}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text placeholder:text-text-faint outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft disabled:opacity-60"
      />
    </div>
  );
}
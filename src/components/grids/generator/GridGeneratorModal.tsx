import { useMemo, useState, type ReactNode } from "react";

import { Modal } from "../../Modal";
import { useConductorMaterials } from "../../../hooks/useConductorMaterials";
import {
  DEFAULT_GENERATOR_PARAMS,
  generateGrid,
  validateGeneratorParams,
  type GeneratedGrid,
  type GeneratorErrors,
  type GeneratorParams,
  type GeneratorShape,
  type LineMode,
  type RodArrangement,
} from "../../../lib/grid-generator";
import { GridLayoutPreview } from "../GridLayoutPreview";

interface GridGeneratorModalProps {
  /** The grid's current size, used as the starting point. */
  initial: { length: number; width: number; burialDepth: number };
  /** True when applying will replace elements that are already on the grid. */
  replacesElements: boolean;
  onClose: () => void;
  onApply: (generated: GeneratedGrid) => void;
}

const SHAPES: { value: GeneratorShape; label: string }[] = [
  { value: "rectangle", label: "مستطیل" },
  { value: "square", label: "مربع" },
  { value: "l-shape", label: "L شکل" },
];

const RODS: { value: RodArrangement; label: string }[] = [
  { value: "none", label: "بدون میله" },
  { value: "corners", label: "گوشه‌ها" },
  { value: "perimeter", label: "پیرامون (فاصلهٔ مساوی)" },
  { value: "intersections", label: "همهٔ تقاطع‌ها" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft";

export function GridGeneratorModal({
  initial,
  replacesElements,
  onClose,
  onApply,
}: GridGeneratorModalProps) {
  const [params, setParams] = useState<GeneratorParams>({
    ...DEFAULT_GENERATOR_PARAMS,
    length: initial.length,
    width: initial.width,
    burialDepth: initial.burialDepth,
  });
  const { materials } = useConductorMaterials();

  const set = <K extends keyof GeneratorParams>(
    key: K,
    value: GeneratorParams[K],
  ) => setParams((prev) => ({ ...prev, [key]: value }));

  const errors = useMemo(() => validateGeneratorParams(params), [params]);
  const generated = useMemo(
    () => (Object.keys(errors).length === 0 ? generateGrid(params) : null),
    [errors, params],
  );

  const isSquare = params.shape === "square";
  const isL = params.shape === "l-shape";

  return (
    <Modal title="مولد شبکه" size="lg" onClose={onClose}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <Field label="شکل شبکه">
            <div className="flex gap-2">
              {SHAPES.map((shape) => (
                <ChoiceButton
                  key={shape.value}
                  active={params.shape === shape.value}
                  onClick={() => set("shape", shape.value)}
                >
                  {shape.label}
                </ChoiceButton>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={isSquare ? "ضلع (m)" : "طول (m)"}
              value={params.length}
              error={errors.length}
              onChange={(v) => set("length", v)}
            />
            {!isSquare && (
              <NumberField
                label="عرض (m)"
                value={params.width}
                error={errors.width}
                onChange={(v) => set("width", v)}
              />
            )}
            {isL && (
              <>
                <NumberField
                  label="طول بریدگی (m)"
                  value={params.notchLength}
                  error={errors.notchLength}
                  onChange={(v) => set("notchLength", v)}
                />
                <NumberField
                  label="عرض بریدگی (m)"
                  value={params.notchWidth}
                  error={errors.notchWidth}
                  onChange={(v) => set("notchWidth", v)}
                />
              </>
            )}
            <NumberField
              label="عمق دفن (m)"
              value={params.burialDepth}
              error={errors.burialDepth}
              step={0.05}
              onChange={(v) => set("burialDepth", v)}
            />
          </div>

          <Field label="هادی‌ها (H۱…Hn و V۱…Vn)">
            <div className="mb-2 flex gap-2">
              {(
                [
                  ["count", "بر اساس تعداد"],
                  ["spacing", "بر اساس فاصله"],
                ] as [LineMode, string][]
              ).map(([mode, label]) => (
                <ChoiceButton
                  key={mode}
                  active={params.lineMode === mode}
                  onClick={() => set("lineMode", mode)}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
            {params.lineMode === "count" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="تعداد خطوط افقی (H)"
                  value={params.horizontalLines}
                  error={errors.horizontalLines}
                  step={1}
                  onChange={(v) => set("horizontalLines", v)}
                />
                <NumberField
                  label="تعداد خطوط عمودی (V)"
                  value={params.verticalLines}
                  error={errors.verticalLines}
                  step={1}
                  onChange={(v) => set("verticalLines", v)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="فاصلهٔ خطوط افقی (m)"
                  value={params.horizontalSpacing}
                  error={errors.horizontalSpacing}
                  onChange={(v) => set("horizontalSpacing", v)}
                />
                <NumberField
                  label="فاصلهٔ خطوط عمودی (m)"
                  value={params.verticalSpacing}
                  error={errors.verticalSpacing}
                  onChange={(v) => set("verticalSpacing", v)}
                />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="جنس هادی">
              <select
                value={params.material}
                onChange={(e) =>
                  set("material", e.target.value as GeneratorParams["material"])
                }
                className={inputClass}
              >
                {materials.length === 0 && (
                  <option value={params.material}>{params.material}</option>
                )}
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </Field>
            <NumberField
              label="سطح مقطع (mm²)"
              value={params.crossSectionMm2}
              error={errors.crossSectionMm2}
              onChange={(v) => set("crossSectionMm2", v)}
            />
          </div>

          <Field label="میله‌های ارت">
            <select
              value={params.rodArrangement}
              onChange={(e) =>
                set("rodArrangement", e.target.value as RodArrangement)
              }
              className={inputClass}
            >
              {RODS.map((rod) => (
                <option key={rod.value} value={rod.value}>
                  {rod.label}
                </option>
              ))}
            </select>
            {errors.rodArrangement && <ErrorText>{errors.rodArrangement}</ErrorText>}
          </Field>

          {params.rodArrangement !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              {params.rodArrangement === "perimeter" && (
                <NumberField
                  label="تعداد میله‌ها"
                  value={params.perimeterRodCount}
                  error={errors.perimeterRodCount}
                  step={1}
                  onChange={(v) => set("perimeterRodCount", v)}
                />
              )}
              <NumberField
                label="طول میله (m)"
                value={params.rodLengthM}
                error={errors.rodLengthM}
                onChange={(v) => set("rodLengthM", v)}
              />
              <NumberField
                label="قطر میله (mm)"
                value={params.rodDiameterMm}
                error={errors.rodDiameterMm}
                onChange={(v) => set("rodDiameterMm", v)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {generated ? (
            <GridLayoutPreview
              length={generated.dimensions.length}
              width={generated.dimensions.width}
              outline={generated.outline}
              elements={generated.elements}
            />
          ) : (
            <div className="flex h-70 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-xs text-text-faint">
              با اصلاح مقادیر نامعتبر، پیش‌نمایش نمایش داده می‌شود.
            </div>
          )}
          {generated && <Summary generated={generated} />}
        </div>
      </div>

      {replacesElements && (
        <p className="mt-5 rounded-lg border border-copper/40 bg-copper/10 px-3.5 py-2.5 text-xs text-copper-text">
          همهٔ المان‌های فعلی شبکه (از جمله حصار، ساختمان و تجهیزات) با شبکهٔ
          تولیدشده جایگزین می‌شوند. تا زمان زدن «ذخیرهٔ تغییرات» چیزی ذخیره
          نمی‌شود و می‌توانید به آخرین ذخیره برگردید.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          انصراف
        </button>
        <button
          type="button"
          disabled={!generated}
          onClick={() => generated && onApply(generated)}
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          اعمال روی طراح
        </button>
      </div>
    </Modal>
  );
}

function Summary({ generated }: { generated: GeneratedGrid }) {
  const { summary, dimensions } = generated;
  const rows: [string, string][] = [
    ["ابعاد", `${dimensions.length} × ${dimensions.width} m`],
    ["خطوط افقی / عمودی", `${summary.horizontalLines} / ${summary.verticalLines}`],
    [
      "فاصله (افقی / عمودی)",
      `${summary.horizontalSpacing} / ${summary.verticalSpacing} m`,
    ],
    ["طول کل هادی", `${summary.conductorLength} m`],
    ["میله‌ها", `${summary.rodCount}`],
  ];
  return (
    <dl className="rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 py-0.5">
          <dt className="text-text-muted">{label}</dt>
          <dd className="font-mono tabular text-text" dir="ltr">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-xs text-danger">{children}</p>;
}

function NumberField({
  label,
  value,
  error,
  step,
  onChange,
}: {
  label: string;
  value: number;
  error?: GeneratorErrors[keyof GeneratorErrors];
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        aria-invalid={!!error}
        className={inputClass}
        dir="ltr"
      />
      {error && <ErrorText>{error}</ErrorText>}
    </Field>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-copper bg-copper/15 text-copper-text"
          : "border-border text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

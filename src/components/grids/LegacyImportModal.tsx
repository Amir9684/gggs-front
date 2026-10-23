import { useMemo, useRef, useState, type ReactNode } from "react";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { GridLayoutPreview } from "./GridLayoutPreview";
import { gridElementsApi } from "../../api/grid-elements.api";
import { gridsApi } from "../../api/grids.api";
import { legacyImportApi } from "../../api/legacy-import.api";
import { useConductorMaterials } from "../../hooks/useConductorMaterials";
import { defaultPropertiesFor } from "../../lib/grid-element-meta";
import { ApiError } from "../../types/api";
import { ConductorMaterial } from "../../types/conductor";
import { GridElementType, type Grid } from "../../types/grid";
import type { LegacyImport, LegacyWarning } from "../../types/legacy";

interface LegacyImportModalProps {
  projectId: string;
  onClose: () => void;
  /** Called with the grid that was created from the file. */
  onImported: (grid: Grid) => void;
}

const FORMAT_LABELS: Record<LegacyImport["format"], string> = {
  full: "فایل کامل (ورودی‌ها و شبکه)",
  "full-two-depth": "فایل کامل با دو عمق",
  "grid-only": "فقط چیدمان شبکه",
};

/** Warnings that need no message here because the form asks for the value. */
const SILENT_WARNINGS = new Set<LegacyWarning["code"]>([
  "BURIAL_DEPTH_MISSING",
  "RODS_WITHOUT_LENGTH",
]);

function warningText(warning: LegacyWarning): string {
  switch (warning.code) {
    case "WELLS_WITHOUT_DEPTH":
      return "چاه‌ها بدون عمق وارد می‌شوند؛ پس از ورود در طراح بررسی کنید.";
    case "GRID_ONLY_FILE":
      return "این فایل فقط چیدمان شبکه را دارد؛ مشخصات خاک، جریان خطا و هادی در آن نیست.";
    case "SECOND_DEPTH_IGNORED":
      return `فایل شبکهٔ دومی در عمقی دیگر دارد (${warning.nodeCount} گره) که وارد نمی‌شود.`;
    case "UNKNOWN_MATERIAL":
      return `جنس هادی «${warning.name}» در فهرست نیست؛ جنس را خودتان انتخاب کنید.`;
    default:
      return "";
  }
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper-soft";

export function LegacyImportModal({
  projectId,
  onClose,
  onImported,
}: LegacyImportModalProps) {
  const [parsed, setParsed] = useState<LegacyImport | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsReading(true);
    setErrors([]);
    setParsed(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = reader.result;

          if (typeof result !== "string") {
            reject(new Error("Failed to read file."));
            return;
          }

          resolve(result.split(",")[1]);
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      console.log(base64);

      setParsed(await legacyImportApi.parseGggs(file));
    } catch (err) {
      setErrors(
        err instanceof ApiError ? err.messages : ["خواندن فایل ناموفق بود."]
      );
    } finally {
      setIsReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Modal title="ورود از فایل ویندوز (.gggs)" size="lg" onClose={onClose}>
      {!parsed ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            فایل داده‌ای را که برنامهٔ ویندوزی GGGS ذخیره کرده انتخاب کنید.
            محتوای فایل ابتدا برای بررسی نشان داده می‌شود و تا تأیید شما چیزی
            ساخته نمی‌شود.
          </p>
          <ErrorBanner messages={errors} />
          <input
            ref={fileInput}
            type="file"
            accept=".gggs,application/octet-stream"
            disabled={isReading}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-text-muted file:me-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:border-copper"
          />
          {isReading && (
            <p className="text-xs text-text-faint">در حال خواندن فایل…</p>
          )}
        </div>
      ) : (
        <Review
          parsed={parsed}
          projectId={projectId}
          onBack={() => setParsed(null)}
          onImported={onImported}
        />
      )}
    </Modal>
  );
}

function Review({
  parsed,
  projectId,
  onBack,
  onImported,
}: {
  parsed: LegacyImport;
  projectId: string;
  onBack: () => void;
  onImported: (grid: Grid) => void;
}) {
  const { materials } = useConductorMaterials();
  const hasRods = parsed.grid.rodCount > 0;

  const [name, setName] = useState(parsed.fileName.replace(/\.[^.]+$/, ""));
  const [burialDepth, setBurialDepth] = useState(0.5);
  const [material, setMaterial] = useState<string>(
    parsed.conductor?.material ?? ConductorMaterial.COPPER_ANNEALED_SOFT_DRAWN
  );
  const [crossSection, setCrossSection] = useState(
    parsed.conductor?.crossSectionMm2 && parsed.conductor.crossSectionMm2 > 0
      ? parsed.conductor.crossSectionMm2
      : 70
  );
  const [rodLength, setRodLength] = useState(3);
  const [rodDiameter, setRodDiameter] = useState(16);

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const problems = [
    name.trim() === "" && "نام شبکه را وارد کنید.",
    !(burialDepth > 0) && "عمق دفن باید مثبت باشد.",
    !(crossSection > 0) && "سطح مقطع هادی باید مثبت باشد.",
    hasRods && !(rodLength > 0) && "طول میله باید مثبت باشد.",
    hasRods && !(rodDiameter > 0) && "قطر میله باید مثبت باشد.",
  ].filter((p): p is string => !!p);

  // The file does not hold per-element properties, so the choices above
  // are applied to every conductor and rod.
  const elements = useMemo(
    () =>
      parsed.elements.map((element) => {
        if (element.type === GridElementType.CONDUCTOR) {
          return {
            ...element,
            properties: { material, crossSectionMm2: crossSection },
          };
        }
        if (element.type === GridElementType.ROD) {
          return {
            ...element,
            properties: { lengthM: rodLength, diameterMm: rodDiameter },
          };
        }
        return {
          ...element,
          properties: defaultPropertiesFor(element.type),
        };
      }),
    [parsed.elements, material, crossSection, rodLength, rodDiameter]
  );

  const handleImport = async () => {
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setIsSaving(true);
    setErrors([]);

    let created: Grid | null = null;
    try {
      created = await gridsApi.create({
        projectId,
        name: name.trim(),
        length: parsed.grid.length,
        width: parsed.grid.width,
        burialDepth,
      });
      await gridElementsApi.saveBulk({
        gridId: created.id,
        elements: elements.map(({ type, geometry, properties }) => ({
          type,
          geometry,
          properties,
        })),
      });
      onImported(created);
    } catch (err) {
      // Don't leave an empty grid behind when the elements did not save.
      if (created) {
        await gridsApi.delete(created.id).catch(() => undefined);
      }
      setErrors(
        err instanceof ApiError ? err.messages : ["ورود شبکه ناموفق بود."]
      );
      setIsSaving(false);
    }
  };

  const warnings = parsed.warnings.filter(
    (warning) => !SILENT_WARNINGS.has(warning.code)
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-muted">
            {parsed.fileName} · {FORMAT_LABELS[parsed.format]}
          </p>

          <Labeled label="نام شبکه">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="عمق دفن (m) — در فایل ذخیره نمی‌شود">
              <NumberInput
                value={burialDepth}
                step={0.05}
                onChange={setBurialDepth}
              />
            </Labeled>
            <Labeled label="سطح مقطع هادی (mm²)">
              <NumberInput value={crossSection} onChange={setCrossSection} />
            </Labeled>
          </div>

          <Labeled label="جنس هادی">
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className={inputClass}
            >
              {materials.length === 0 && (
                <option value={material}>{material}</option>
              )}
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Labeled>

          {hasRods && (
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="طول میله‌ها (m) — در فایل ذخیره نمی‌شود">
                <NumberInput value={rodLength} onChange={setRodLength} />
              </Labeled>
              <Labeled label="قطر میله‌ها (mm)">
                <NumberInput value={rodDiameter} onChange={setRodDiameter} />
              </Labeled>
            </div>
          )}

          <FileValues parsed={parsed} />
        </div>

        <div className="flex flex-col gap-3">
          <GridLayoutPreview
            length={parsed.grid.length}
            width={parsed.grid.width}
            elements={elements}
          />
          <dl className="rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-xs">
            {[
              ["ابعاد", `${parsed.grid.length} × ${parsed.grid.width} m`],
              ["هادی‌ها", `${parsed.grid.conductorCount}`],
              ["میله‌ها", `${parsed.grid.rodCount}`],
              ["چاه‌ها", `${parsed.grid.wellCount}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-0.5">
                <dt className="text-text-muted">{label}</dt>
                <dd className="font-mono tabular text-text" dir="ltr">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-copper/40 bg-copper/10 px-3.5 py-2.5 text-xs text-copper-text">
          {warnings.map((warning, index) => (
            <li key={index}>{warningText(warning)}</li>
          ))}
        </ul>
      )}

      <ErrorBanner messages={errors} />

      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSaving}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          انتخاب فایل دیگر
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={isSaving}
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "در حال ایجاد…" : "ایجاد شبکه"}
        </button>
      </div>
    </div>
  );
}

/** What the Windows input form held, shown for reference (not imported). */
function FileValues({ parsed }: { parsed: LegacyImport }) {
  const rows: [string, string][] = [];
  if (parsed.soil) {
    rows.push(
      ["مقاومت ویژهٔ خاک", `${parsed.soil.resistivity} Ω·m`],
      [
        "لایهٔ سطحی",
        `${
          parsed.soil.surfaceLayerResistivity
        } Ω·m · ${parsed.soil.surfaceLayerThickness.toFixed(3)} m`,
      ]
    );
  }
  if (parsed.fault) {
    rows.push(
      ["جریان خطا", `${parsed.fault.faultCurrent} A`],
      ["مدت زمان شوک", `${parsed.fault.shockDuration} s`]
    );
    if (parsed.fault.faultDuration !== null) {
      rows.push(["مدت زمان خطا", `${parsed.fault.faultDuration} s`]);
    }
  }
  if (parsed.conductor?.name) {
    rows.push(["هادی در فایل", parsed.conductor.name]);
  }
  if (rows.length === 0) return null;

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-bold text-text">
        مقادیر ورودی فایل (برای ساخت مدل خاک و کیس)
      </h4>
      <dl className="rounded-lg border border-border-soft bg-surface-2 px-3.5 py-3 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-0.5">
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-text" dir="ltr">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-text-faint">
        این مقادیر فقط برای مرجع نمایش داده می‌شوند؛ مدل خاک و کیس محاسباتی را
        خودتان با آن‌ها بسازید.
      </p>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  step,
  onChange,
}: {
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? "any"}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className={inputClass}
      dir="ltr"
    />
  );
}

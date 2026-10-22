import { useEffect, useMemo, useRef, useState } from "react";

import { calculationCasesApi } from "../../api/calculations.api";
import { gridsApi } from "../../api/grids.api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ApiError } from "../../types/api";
import type {
  CalculationCase,
  CalculationPreview,
  CalculationResult,
} from "../../types/calculation";
import type { Grid } from "../../types/grid";
import { ResultSummary } from "./ResultSummary";

interface LiveRecalculationPanelProps {
  calculationCase: CalculationCase;
}

interface Inputs {
  faultCurrent: number;
  splitFactor: number;
  faultDuration: number;
  surfaceLayerResistivity: number;
  surfaceLayerThickness: number;
  burialDepth: number;
  createdAt: string;
  updatedAt: string;
}

type NumericInputKey = {
  [K in keyof Inputs]: Inputs[K] extends number ? K : never;
}[keyof Inputs];

interface SliderSpec {
  key: NumericInputKey;
  label: string;
  unit: string;
  step: number;
  min: number | ((base: number) => number);
  max: number | ((base: number) => number);
}

const SLIDERS: SliderSpec[] = [
  {
    key: "faultCurrent",
    label: "جریان خطا (If)",
    unit: "A",
    step: 10,
    min: (base) => Math.max(10, Math.round(base * 0.2)),
    max: (base) => Math.round(base * 3),
  },
  {
    key: "splitFactor",
    label: "ضریب تقسیم جریان (Sf)",
    unit: "",
    step: 0.01,
    min: 0.05,
    max: 1,
  },
  {
    key: "faultDuration",
    label: "مدت زمان خطا (tf)",
    unit: "s",
    step: 0.01,
    min: 0.01,
    max: 1,
  },
  {
    key: "surfaceLayerResistivity",
    label: "مقاومت ویژهٔ لایهٔ سطحی (ρs)",
    unit: "Ω·m",
    step: 50,
    min: 50,
    max: (base) => Math.max(5000, Math.round(base * 2)),
  },
  {
    key: "surfaceLayerThickness",
    label: "ضخامت لایهٔ سطحی (hs)",
    unit: "m",
    step: 0.01,
    min: 0,
    max: 0.3,
  },
  {
    key: "burialDepth",
    label: "عمق دفن (h)",
    unit: "m",
    step: 0.05,
    min: 0.25,
    max: 2.5,
  },
];

const bound = (value: number | ((base: number) => number), base: number) =>
  typeof value === "function" ? value(base) : value;

const DEBOUNCE_MS = 300;

/**
 * Sliders tied to the inputs of a case. Moving one re-runs the calculation
 * through `POST /calculation-cases/:id/preview` (debounced) and shows the
 * new numbers right away. Nothing is saved: the case and its stored
 * results stay as they were.
 */
export function LiveRecalculationPanel({
  calculationCase,
}: LiveRecalculationPanelProps) {
  const { fault, settings } = calculationCase;
  const gridId = calculationCase.grid?.id;

  const [grid, setGrid] = useState<Grid | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);

  useEffect(() => {
    if (!gridId) return;
    let cancelled = false;
    gridsApi
      .getOne(gridId)
      .then((loaded) => !cancelled && setGrid(loaded))
      .catch((err: unknown) => {
        if (cancelled) return;
        setGridError(
          err instanceof ApiError ? err.messages[0] : "دریافت شبکه ناموفق بود."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [gridId]);

  const base = useMemo<Inputs | null>(
    () =>
      fault && settings && grid
        ? {
            faultCurrent: fault.faultCurrent,
            splitFactor: fault.splitFactor,
            faultDuration: fault.faultDuration,
            surfaceLayerResistivity: settings.surfaceLayerResistivity,
            surfaceLayerThickness: settings.surfaceLayerThickness,
            burialDepth: grid.burialDepth,
            createdAt: grid.createdAt,
            updatedAt: grid.updatedAt,
          }
        : null,
    [fault, settings, grid]
  );

  if (!fault || !settings) {
    return (
      <p className="text-xs text-text-faint">
        اطلاعات خطا یا تنظیمات این کیس ثبت نشده است.
      </p>
    );
  }
  if (gridError) return <p className="text-xs text-danger">{gridError}</p>;
  if (!base) return <p className="text-xs text-text-faint">در حال بارگذاری…</p>;

  return (
    <Sliders
      key={`${calculationCase.id}:${grid?.id}`}
      caseId={calculationCase.id}
      base={base}
      bodyWeight={settings.bodyWeight}
    />
  );
}

function Sliders({
  caseId,
  base,
  bodyWeight,
}: {
  caseId: string;
  base: Inputs;
  bodyWeight: number;
}) {
  const [inputs, setInputs] = useState<Inputs>(base);
  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const debounced = useDebouncedValue(inputs, DEBOUNCE_MS);
  const latestRequest = useRef(0);

  const isChanged = SLIDERS.some(({ key }) => inputs[key] !== base[key]);

  useEffect(() => {
    // Only the newest request may update the screen: a slow earlier answer
    // must not overwrite a newer one.
    const requestId = ++latestRequest.current;
    setIsLoading(true);

    calculationCasesApi
      .preview(caseId, {
        grid: { burialDepth: debounced.burialDepth },
        fault: {
          faultCurrent: debounced.faultCurrent,
          splitFactor: debounced.splitFactor,
          faultDuration: debounced.faultDuration,
        },
        settings: {
          surfaceLayerResistivity: debounced.surfaceLayerResistivity,
          surfaceLayerThickness: debounced.surfaceLayerThickness,
        },
      })
      .then((data) => {
        if (requestId !== latestRequest.current) return;
        setPreview(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (requestId !== latestRequest.current) return;
        setError(
          err instanceof ApiError
            ? err.messages[0]
            : "محاسبهٔ پیش‌نمایش ناموفق بود."
        );
      })
      .finally(() => {
        if (requestId === latestRequest.current) setIsLoading(false);
      });
  }, [caseId, debounced]);

  // `ResultSummary` shows saved results; a preview has the same numbers,
  // so it is shown the same way.
  const asResult = useMemo<CalculationResult | null>(
    () =>
      preview
        ? {
            id: "preview",
            gridResistance: preview.gridResistance,
            gpr: preview.gpr,
            meshVoltage: preview.meshVoltage,
            touchVoltage: preview.touchVoltage,
            stepVoltage: preview.stepVoltage,
            permissibleTouchVoltage: preview.permissibleTouchVoltage,
            permissibleStepVoltage: preview.permissibleStepVoltage,
            safe: preview.safe,
            createdAt: base.createdAt,
            updatedAt: base.updatedAt,
            details: preview.details,
          }
        : null,
    [preview]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="flex flex-col gap-4">
        {SLIDERS.map((spec) => {
          const min = bound(spec.min, base[spec.key]);
          const max = Math.max(bound(spec.max, base[spec.key]), base[spec.key]);
          const value = inputs[spec.key];
          return (
            <div key={spec.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor={`live-${spec.key}`}
                  className="text-xs font-medium text-text-muted"
                >
                  {spec.label}
                </label>
                <span className="font-mono text-xs tabular text-text" dir="ltr">
                  {value}
                  {spec.unit && ` ${spec.unit}`}
                </span>
              </div>
              <input
                id={`live-${spec.key}`}
                type="range"
                min={Math.min(min, base[spec.key])}
                max={max}
                step={spec.step}
                value={value}
                onChange={(e) =>
                  setInputs((prev) => ({
                    ...prev,
                    [spec.key]: e.target.valueAsNumber,
                  }))
                }
                className="accent-copper"
                dir="ltr"
              />
              {value !== base[spec.key] && (
                <span className="text-[11px] text-text-faint" dir="ltr">
                  مقدار کیس: {base[spec.key]}
                </span>
              )}
            </div>
          );
        })}

        <button
          type="button"
          disabled={!isChanged}
          onClick={() => setInputs(base)}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          بازگشت به مقادیر کیس
        </button>

        {preview && (
          <p className="text-xs text-text-faint" dir="ltr">
            Df = {preview.decrementFactor}
          </p>
        )}
      </div>

      <div
        className={isLoading && preview ? "opacity-60 transition-opacity" : ""}
      >
        {error && (
          <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        {asResult ? (
          <ResultSummary result={asResult} bodyWeight={bodyWeight} />
        ) : (
          !error && <p className="text-xs text-text-faint">در حال محاسبه…</p>
        )}
      </div>
    </div>
  );
}

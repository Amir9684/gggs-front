import { useEffect, useState } from "react";

import { conductorsApi } from "../../api/conductors.api";
import { ApiError } from "../../types/api";
import type {
  ConductorMaterial,
  ConductorSizingResult,
} from "../../types/conductor";

interface ConductorSizingPreviewProps {
  /** Empty until the user picks a material. */
  material: ConductorMaterial | "" | undefined;
  /** Fault current, A. */
  faultCurrent: unknown;
  /** Conduction time tc, s (the sizing duration, or the fault duration). */
  duration: unknown;
  /** Ambient temperature Ta, °C. */
  ambientTemperature: unknown;
  /** Allowable temperature Tm, °C; empty means the material's fusing temperature. */
  allowableTemperature: unknown;
  /** Cross-section the user entered, mm², if any. */
  crossSectionMm2: unknown;
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; result: ConductorSizingResult };

const DEBOUNCE_MS = 400;

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Live minimum-area preview. The calculation runs on the backend
 * (`POST /conductors/sizing`) so the form shows the same value that is
 * stored with the case — nothing is calculated in the browser.
 */
export function ConductorSizingPreview({
  material,
  faultCurrent,
  duration,
  ambientTemperature,
  allowableTemperature,
  crossSectionMm2,
}: ConductorSizingPreviewProps) {
  const current = positiveNumber(faultCurrent);
  const time = positiveNumber(duration);
  const allowable = positiveNumber(allowableTemperature);
  const ambient =
    typeof ambientTemperature === "number" &&
    Number.isFinite(ambientTemperature)
      ? ambientTemperature
      : undefined;
  const enteredArea = positiveNumber(crossSectionMm2);

  const canCalculate =
    !!material &&
    current !== undefined &&
    time !== undefined &&
    ambient !== undefined &&
    (allowable === undefined || allowable > ambient);

  const [state, setState] = useState<PreviewState>({ status: "idle" });

  useEffect(() => {
    if (!canCalculate || !material) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setState({ status: "loading" });
      conductorsApi
        .calculateSizing({
          material,
          faultCurrent: current,
          duration: time,
          ambientTemperature: ambient,
          allowableTemperature: allowable,
        })
        .then((result) => {
          if (!cancelled) setState({ status: "ok", result });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setState({
            status: "error",
            message:
              err instanceof ApiError
                ? err.messages[0]
                : "محاسبهٔ سطح مقطع ناموفق بود.",
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canCalculate, material, current, time, ambient, allowable]);

  if (!canCalculate) {
    return (
      <p className="mt-2 text-xs text-text-faint">
        برای محاسبهٔ سطح مقطع، جنس هادی، جریان و مدت‌زمان خطا را وارد کنید.
      </p>
    );
  }

  if (state.status === "idle" || state.status === "loading") {
    return (
      <p className="mt-2 text-xs text-text-faint">در حال محاسبهٔ سطح مقطع…</p>
    );
  }

  if (state.status === "error") {
    return <p className="mt-2 text-xs text-danger">{state.message}</p>;
  }

  const { result } = state;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <p className="font-mono text-xs tabular text-text-muted" dir="ltr">
        Amin: {result.minimumAreaMm2.toFixed(1)} mm² (
        {result.minimumAreaKcmil.toFixed(0)} kcmil)
        {result.standardSizeMm2 !== null &&
          ` → استاندارد: ${result.standardSizeMm2} mm²`}
      </p>
      {result.standardSizeMm2 === null && (
        <p className="text-xs text-copper-text">
          سطح مقطع لازم از بزرگ‌ترین اندازهٔ استاندارد (۳۰۰ mm²) بیشتر است؛
          اندازهٔ استاندارد وجود ندارد.
        </p>
      )}
      {enteredArea !== undefined &&
        (enteredArea >= result.minimumAreaMm2 ? (
          <p className="text-xs text-success">
            سطح مقطع واردشده ({enteredArea} mm²) کافی است.
          </p>
        ) : (
          <p className="text-xs text-danger">
            سطح مقطع واردشده ({enteredArea} mm²) از حداقل مجاز (
            {result.minimumAreaMm2.toFixed(1)} mm²) کمتر است.
          </p>
        ))}
    </div>
  );
}

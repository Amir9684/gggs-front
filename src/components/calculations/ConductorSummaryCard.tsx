import { useConductorMaterials } from "../../hooks/useConductorMaterials";
import type { CaseConductor } from "../../types/conductor";

interface ConductorSummaryCardProps {
  /**
   * `undefined` when the API didn't send the field (older backend) — the
   * card renders nothing. `null` means the case has no conductor.
   */
  conductor: CaseConductor | null | undefined;
}

/** The conductor chosen for a case and the sizing computed for it. */
export function ConductorSummaryCard({ conductor }: ConductorSummaryCardProps) {
  const { findMaterial } = useConductorMaterials();

  if (conductor === undefined) return null;

  if (conductor === null) {
    return (
      <div className="mt-3 rounded-xl border border-copper/40 bg-copper/10 p-4 text-xs text-copper-text">
        برای این کیس هادی انتخاب نشده است. برای محاسبهٔ سطح مقطع، یک کیس جدید با
        انتخاب جنس هادی بسازید.
      </div>
    );
  }

  const material = findMaterial(conductor.material);

  return (
    <div className="mt-3 rounded-xl border border-border-soft bg-surface p-4 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-faint">جنس هادی:</span>
        <span className="rounded-full border border-copper/40 px-2.5 py-0.5 font-mono text-copper-text">
          {material?.name ?? conductor.material}
        </span>
        <span
          className="rounded-full border border-border px-2.5 py-0.5 font-mono text-text-muted"
          dir="ltr"
        >
          حداقل سطح مقطع: {conductor.minimumAreaMm2.toFixed(1)} mm² (
          {conductor.minimumAreaKcmil.toFixed(0)} kcmil)
        </span>
        {conductor.standardSizeMm2 !== null ? (
          <span
            className="rounded-full border border-border px-2.5 py-0.5 font-mono text-text-muted"
            dir="ltr"
          >
            اندازهٔ استاندارد: {conductor.standardSizeMm2} mm²
          </span>
        ) : (
          <span className="text-copper-text">
            بیش از ۳۰۰ mm² — اندازهٔ استاندارد وجود ندارد
          </span>
        )}
      </div>

      <dl
        className="mt-3 grid grid-cols-2 gap-3 font-mono tabular text-text-muted sm:grid-cols-4"
        dir="ltr"
      >
        <div>
          <dt className="text-text-faint">Ta</dt>
          <dd>{conductor.ambientTemperature} °C</dd>
        </div>
        <div>
          <dt className="text-text-faint">Tm</dt>
          <dd>{conductor.allowableTemperature} °C</dd>
        </div>
        <div>
          <dt className="text-text-faint">tc</dt>
          <dd>{conductor.sizingDuration} s</dd>
        </div>
        {conductor.crossSectionMm2 !== null && (
          <div>
            <dt className="text-text-faint">Entered area</dt>
            <dd>{conductor.crossSectionMm2} mm²</dd>
          </div>
        )}
      </dl>

      {conductor.crossSectionAdequate === false && (
        <p className="mt-3 text-danger">
          سطح مقطع واردشده ({conductor.crossSectionMm2} mm²) از حداقل مجاز (
          {conductor.minimumAreaMm2.toFixed(1)} mm²) کمتر است.
        </p>
      )}
      {conductor.crossSectionAdequate === true && (
        <p className="mt-3 text-success">سطح مقطع واردشده کافی است.</p>
      )}
    </div>
  );
}

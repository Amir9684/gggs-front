import type { GalerkinSolverDetails } from "../../types/calculation";

interface GalerkinSolverSummaryProps {
  details: GalerkinSolverDetails;
}

/** What the Galerkin solver worked with, shown beside the result numbers. */
export function GalerkinSolverSummary({ details }: GalerkinSolverSummaryProps) {
  const items: Array<[string, string]> = [
    ["طول قطعه", `${details.segmentLength} m`],
    ["تعداد قطعات هادی", String(details.segmentCount)],
    ["تعداد میله‌ها", String(details.rodCount)],
    ["تعداد چاه‌ها", String(details.wellCount)],
    ["تعداد مش‌ها", String(details.meshCount)],
    [
      "امپدانس ضربه (Zsurge)",
      details.surgeImpedance === null
        ? "—"
        : `${details.surgeImpedance.toFixed(3)} Ω`,
    ],
  ];

  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 p-4">
      <h4 className="text-xs font-bold text-text">جزئیات حل‌گر گالرکین</h4>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-text-faint">{label}</dt>
            <dd className="mt-0.5 font-mono tabular text-text" dir="ltr">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {details.surgeImpedance === null && (
        <p className="mt-3 text-xs text-text-faint">
          امپدانس ضربه فقط برای شبکه‌هایی با ۴ تا ۶۴ مش محاسبه می‌شود.
        </p>
      )}
    </div>
  );
}

import type { CalculationResult } from "../../types/calculation";

interface ResultSummaryProps {
  result: CalculationResult;
  /**
   * Body weight (kg) the case was run with. It decides which of the 50 kg /
   * 70 kg limits the safe / not-safe verdict is based on, so that column is
   * marked in the limits table.
   */
  bodyWeight?: number;
}

interface Metric {
  label: string;
  value: number;
  unit: string;
  /** Paired permissible-limit value, when this metric has a safety threshold. */
  limit?: number;
}

export function ResultSummary({ result, bodyWeight }: ResultSummaryProps) {
  // `details` is `null` for results saved before the backend persisted it,
  // and the nested fields are read defensively so a front end deployed
  // slightly ahead of the backend still renders.
  const details = result.details ?? null;
  const warnings = details?.warnings ?? [];
  const limits = details?.permissibleVoltages;
  const grid = details?.grid;
  const safeForEveryPoint = details?.safeForEveryPoint === true;

  const metrics: Metric[] = [
    { label: "مقاومت شبکه (Rg)", value: result.gridResistance, unit: "Ω" },
    { label: "افزایش پتانسیل زمین (GPR)", value: result.gpr, unit: "V" },
    { label: "ولتاژ مش (Em)", value: result.meshVoltage, unit: "V" },
    {
      label: "ولتاژ تماس (Etouch)",
      value: result.touchVoltage,
      unit: "V",
      limit: result.permissibleTouchVoltage,
    },
    {
      label: "ولتاژ گام (Estep)",
      value: result.stepVoltage,
      unit: "V",
      limit: result.permissibleStepVoltage,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
          result.safe
            ? "border-success/40 bg-success/10"
            : "border-danger/40 bg-danger/10"
        }`}
      >
        <span
          className={`text-sm font-bold ${
            result.safe ? "text-success" : "text-danger"
          }`}
        >
          {result.safe ? "طرح ایمن است" : "طرح ایمن نیست"}
        </span>
        <span className="font-mono text-xs tabular text-text-faint" dir="ltr">
          {new Date(result.createdAt).toLocaleString("en-US")}
        </span>
      </div>

      {safeForEveryPoint && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 text-xs text-success">
          GPR ({result.gpr.toFixed(1)} V) از حد مجاز ولتاژ تماس (
          {result.permissibleTouchVoltage.toFixed(1)} V) بیشتر نیست؛ طرح در همهٔ
          نقاط ایمن است.
        </p>
      )}

      {warnings.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-copper/40 bg-copper/10 px-4 py-3"
        >
          <p className="text-xs font-bold text-copper-text">
            هشدار محدودهٔ اعتبار فرمول‌ها
          </p>
          <ul className="mt-1.5 list-disc space-y-1 ps-5 text-xs text-copper-text">
            {warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {metrics.map((metric) => {
          const overLimit =
            metric.limit !== undefined && metric.value > metric.limit;
          return (
            <div
              key={metric.label}
              className="rounded-lg border border-border-soft bg-surface-2 px-4 py-3"
            >
              <span className="text-xs text-text-muted">{metric.label}</span>
              <p
                className={`mt-1 font-mono text-sm tabular ${
                  overLimit ? "text-danger" : "text-text"
                }`}
                dir="ltr"
              >
                {metric.value.toFixed(3)} {metric.unit}
                {metric.limit !== undefined && (
                  <span className="text-text-faint">
                    {" "}
                    / حد مجاز {metric.limit.toFixed(3)} {metric.unit}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {limits && (
        <div className="rounded-lg border border-border-soft bg-surface-2 px-4 py-3">
          <h4 className="text-xs font-medium text-text-muted">
            حدود مجاز برای وزن بدن ۵۰ و ۷۰ کیلوگرم
          </h4>
          <table className="mt-2 w-full font-mono text-xs tabular" dir="ltr">
            <thead>
              <tr className="text-text-faint">
                <th className="py-1 text-left font-normal" />
                <th className="py-1 text-right font-normal">محاسبه‌شده</th>
                <WeightHeader weight={50} current={bodyWeight} />
                <WeightHeader weight={70} current={bodyWeight} />
              </tr>
            </thead>
            <tbody>
              <LimitRow
                label="Etouch"
                actual={result.touchVoltage}
                limit50={limits.kg50.touch}
                limit70={limits.kg70.touch}
                bodyWeight={bodyWeight}
              />
              <LimitRow
                label="Estep"
                actual={result.stepVoltage}
                limit50={limits.kg50.step}
                limit70={limits.kg70.step}
                bodyWeight={bodyWeight}
              />
            </tbody>
          </table>
          <p className="mt-2 text-xs text-text-faint">
            حکم ایمنی بر اساس وزن بدن تنظیم‌شدهٔ کیس
            {bodyWeight !== undefined ? ` (${bodyWeight} kg)` : ""} صادر می‌شود.
            مقادیر بالاتر از حد مجاز با رنگ قرمز نشان داده شده‌اند.
          </p>
        </div>
      )}

      {details && (
        <details className="rounded-lg border border-border-soft bg-surface-2 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-text-muted">
            مقادیر میانی محاسبه
          </summary>
          <dl
            className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs tabular text-text-muted sm:grid-cols-3"
            dir="ltr"
          >
            <div>
              <dt className="text-text-faint">IG (effective)</dt>
              <dd>{details.effectiveGridCurrent.toFixed(2)} A</dd>
            </div>
            <div>
              <dt className="text-text-faint">Cs</dt>
              <dd>{details.cs.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Km</dt>
              <dd>{details.geometricFactors.km.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Ki</dt>
              <dd>{details.geometricFactors.ki.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Kii</dt>
              <dd>{details.geometricFactors.kii.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Kh</dt>
              <dd>{details.geometricFactors.kh.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Ks</dt>
              <dd>{details.geometricFactors.ks.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-text-faint">n</dt>
              <dd>{details.geometricFactors.n.toFixed(2)}</dd>
            </div>
            {details.geometricFactors.nStep !== undefined && (
              <div>
                <dt className="text-text-faint">n (step)</dt>
                <dd>{details.geometricFactors.nStep.toFixed(2)}</dd>
              </div>
            )}
            {details.geometricFactors.kiStep !== undefined && (
              <div>
                <dt className="text-text-faint">Ki (step)</dt>
                <dd>{details.geometricFactors.kiStep.toFixed(4)}</dd>
              </div>
            )}
            {details.twoLayer && (
              <>
                <div>
                  <dt className="text-text-faint">rho1 / rho2</dt>
                  <dd>
                    {details.twoLayer.upperResistivity} /{" "}
                    {details.twoLayer.lowerResistivity} Ω·m
                  </dd>
                </div>
                <div>
                  <dt className="text-text-faint">hs (upper layer)</dt>
                  <dd>{details.twoLayer.upperThickness} m</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Xhor</dt>
                  <dd>{details.twoLayer.xhor.toFixed(4)}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Yhor</dt>
                  <dd>{details.twoLayer.yhor.toFixed(4)}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Cm (mesh)</dt>
                  <dd>{details.twoLayer.meshCorrection.toFixed(4)}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Cs (step, soil)</dt>
                  <dd>{details.twoLayer.stepCorrection.toFixed(4)}</dd>
                </div>
              </>
            )}
            {grid && (
              <>
                <div>
                  <dt className="text-text-faint">Conductors (length)</dt>
                  <dd>{grid.conductorCountAlongLength}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Conductors (width)</dt>
                  <dd>{grid.conductorCountAlongWidth}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Meshes</dt>
                  <dd>{grid.meshCount}</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Avg spacing</dt>
                  <dd>{grid.averageSpacing.toFixed(2)} m</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Conductor length</dt>
                  <dd>{grid.totalConductorLength.toFixed(1)} m</dd>
                </div>
                <div>
                  <dt className="text-text-faint">Rods</dt>
                  <dd>
                    {grid.rodCount}
                    {grid.rodCount > 0
                      ? ` (${grid.totalRodLength.toFixed(1)} m)`
                      : ""}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </details>
      )}
    </div>
  );
}

/** Column header for one body weight; marks the weight the verdict used. */
function WeightHeader({
  weight,
  current,
}: {
  weight: 50 | 70;
  current?: number;
}) {
  const isCurrent = current === weight;
  return (
    <th
      className={`py-1 text-right font-normal ${
        isCurrent ? "text-copper-text" : "text-text-faint"
      }`}
    >
      {weight} kg
      {isCurrent && <span className="block text-[10px]">مبنای حکم</span>}
    </th>
  );
}

/** One row of the limits table: the computed value against both limits. */
function LimitRow({
  label,
  actual,
  limit50,
  limit70,
  bodyWeight,
}: {
  label: string;
  actual: number;
  limit50: number;
  limit70: number;
  bodyWeight?: number;
}) {
  const cell = (limit: number, weight: 50 | 70) => {
    const over = actual > limit;
    const isCurrent = bodyWeight === weight;
    return (
      <td
        className={`py-1 text-right ${
          over ? "text-danger" : isCurrent ? "text-copper-text" : "text-text"
        }`}
      >
        {limit.toFixed(3)} V
      </td>
    );
  };

  return (
    <tr className="border-t border-border-soft">
      <td className="py-1 text-left text-text-muted">{label}</td>
      <td className="py-1 text-right text-text">{actual.toFixed(3)} V</td>
      {cell(limit50, 50)}
      {cell(limit70, 70)}
    </tr>
  );
}

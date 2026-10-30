import { useState } from 'react';

import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { SelectField } from '../auth/SelectField';
import { UseSplitFactorInCase } from './UseSplitFactorInCase';
import { splitFactorApi } from '../../api/split-factor.api';
import { ApiError } from '../../types/api';
import type {
  Ieee80CalculationResult,
  Ieee80FaultType,
  Ieee80FootingSet,
} from '../../types/split-factor';

const FAULT_TYPE_LABELS: Record<Ieee80FaultType, string> = {
  1: '۱۰۰٪ منبع دور (بدون منبع محلی)',
  2: '۷۵٪ منبع دور – ۲۵٪ منبع محلی',
  3: '۵۰٪ منبع دور – ۵۰٪ منبع محلی',
  4: '۲۵٪ منبع دور – ۷۵٪ منبع محلی',
};

const FOOTING_LABELS: Record<Ieee80FootingSet, string> = {
  1: 'انتقال ۱۵ Ω و توزیع ۲۵ Ω (سیم گارد خوب زمین‌شده)',
  2: 'انتقال ۱۰۰ Ω و توزیع ۲۰۰ Ω (سیم گارد ضعیف زمین‌شده)',
};

/**
 * Split factor from the IEEE Std 80 Annex C curves: pick the fault
 * distribution and the tower footing resistance, the number of lines and
 * the grid resistance. Like the Windows form, a local fault source only
 * has curves for substations without distribution lines.
 */
export function Ieee80SplitFactorForm() {
  const [faultType, setFaultType] = useState<Ieee80FaultType>(1);
  const [footingSet, setFootingSet] = useState<Ieee80FootingSet>(1);
  const [transmission, setTransmission] = useState('2');
  const [distribution, setDistribution] = useState('4');
  const [gridResistance, setGridResistance] = useState('0.5');

  const [errors, setErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<Ieee80CalculationResult | null>(null);

  const handleFaultTypeChange = (value: Ieee80FaultType) => {
    setFaultType(value);
    // A local source has curves only without distribution lines.
    if (value !== 1) setDistribution('0');
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const lines = [transmission, distribution].map((text) =>
      text.trim() === '' ? NaN : Number(text)
    );
    const rg = gridResistance.trim() === '' ? NaN : Number(gridResistance);

    const problems: string[] = [];
    if (lines.some((count) => !Number.isInteger(count) || count < 0 || count > 18)) {
      problems.push('تعداد خطوط باید عدد صحیح بین ۰ و ۱۸ باشد.');
    }
    if (!(rg > 0)) problems.push('مقاومت شبکه زمین را وارد کنید (بزرگ‌تر از صفر).');
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setErrors([]);
    setIsCalculating(true);
    try {
      setResult(
        await splitFactorApi.calculateIeee80({
          faultType,
          footingSet,
          transmissionLines: lines[0],
          distributionLines: lines[1],
          gridResistance: rg,
        })
      );
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['محاسبه ناموفق بود.']);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <ErrorBanner messages={errors} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="ieee80-fault"
            label="توزیع جریان خطا"
            value={String(faultType)}
            onChange={(e) =>
              handleFaultTypeChange(Number(e.target.value) as Ieee80FaultType)
            }
          >
            {([1, 2, 3, 4] as const).map((type) => (
              <option key={type} value={type}>
                {FAULT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="ieee80-footing"
            label="مقاومت پایه دکل"
            value={String(footingSet)}
            onChange={(e) => {
              setFootingSet(Number(e.target.value) as Ieee80FootingSet);
              setResult(null);
            }}
          >
            {([1, 2] as const).map((set) => (
              <option key={set} value={set}>
                {FOOTING_LABELS[set]}
              </option>
            ))}
          </SelectField>

          <FormField
            id="ieee80-transmission"
            label="تعداد خطوط انتقال (۰ تا ۱۸)"
            type="number"
            step="1"
            dir="ltr"
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
          />

          <FormField
            id="ieee80-distribution"
            label="تعداد خطوط توزیع (۰ تا ۱۸)"
            type="number"
            step="1"
            dir="ltr"
            disabled={faultType !== 1}
            value={distribution}
            onChange={(e) => setDistribution(e.target.value)}
          />

          <FormField
            id="ieee80-rg"
            label="مقاومت شبکه زمین Rg (Ω)"
            type="number"
            step="any"
            dir="ltr"
            value={gridResistance}
            onChange={(e) => setGridResistance(e.target.value)}
          />
        </div>

        {faultType !== 1 && (
          <p className="text-xs text-text-faint">
            برای منبع خطای محلی فقط منحنی‌های بدون خط توزیع وجود دارد و حداقل یک
            خط انتقال لازم است.
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isCalculating}
            className="rounded-lg bg-copper px-5 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCalculating ? 'در حال محاسبه…' : 'محاسبه'}
          </button>
        </div>
      </form>

      {result && (
        <section className="rounded-xl border border-copper/40 bg-surface p-5">
          <h2 className="font-bold text-text">نتیجه</h2>
          <p className="mt-4 text-xs text-text-faint">ضریب تقسیم جریان (Sf)</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular text-copper-text" dir="ltr">
            {result.splitFactor.toFixed(2)} %
          </p>
          {result.clamped && (
            <p className="mt-3 text-xs text-text-muted">
              مقاومت شبکه خارج از بازهٔ منحنی‌ها (۰٫۱ تا ۲۵ Ω) است؛ مقدار
              نزدیک‌ترین نقطهٔ منحنی (
              {result.clamped === 'LOW' ? '۰٫۱ Ω' : '۲۵ Ω'}) به کار رفته است.
            </p>
          )}
          <UseSplitFactorInCase splitFactorPercent={result.splitFactor} />
        </section>
      )}
    </div>
  );
}

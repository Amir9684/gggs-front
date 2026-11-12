import { useState } from 'react';

import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { SelectField } from '../auth/SelectField';
import { GridResistanceFromCase } from './GridResistanceFromCase';
import { SplitProjectsBar, type SplitInputSnapshot } from './SplitProjectsBar';
import { UseSplitFactorInCase } from './UseSplitFactorInCase';
import { ramezaniApi } from '../../api/ramezani.api';
import { ApiError } from '../../types/api';
import type {
  RamezaniCalculationResult,
  RamezaniTerminalPayload,
} from '../../types/ramezani';
import type {
  ComplexValue,
  GroundWire,
  ReactanceSource,
  ResistanceSource,
} from '../../types/split-factor';

/** One terminal of the form: everything is text until Calculate parses it. */
interface TerminalForm {
  key: number;
  name: string;
  faultRe: string;
  faultIm: string;
  wireMode: 'CATALOG' | 'DIRECT';
  groundWireId: string;
  earthResistivity: string;
  resistanceSource: ResistanceSource;
  reactanceSource: ReactanceSource;
  zgwRe: string;
  zgwIm: string;
  mutualRe: string;
  mutualIm: string;
  /** Spans are uniform in this form: this many equal spans... */
  spanCount: string;
  spanLength: string;
  towerFootingResistance: string;
  /** ...and the part of the line that has a ground wire, in percent. */
  wireCoverage: string;
  /** Set when a loaded project had unequal spans, shown as the means. */
  loadedNonUniform: boolean;
}

let nextKey = 1;

function newTerminal(index: number): TerminalForm {
  return {
    key: nextKey++,
    name: `ترمینال ${index}`,
    faultRe: '400',
    faultIm: '-500',
    wireMode: 'DIRECT',
    groundWireId: '',
    earthResistivity: '1000',
    resistanceSource: 'AC',
    reactanceSource: 'GMR',
    zgwRe: '',
    zgwIm: '',
    // The Windows dialog's 0.00005 + j0.00038 is per metre; Zgm must be in
    // the same unit as Zgw here (ohm/km), so the same values times 1000.
    mutualRe: '0.05',
    mutualIm: '0.38',
    spanCount: '20',
    spanLength: '300',
    towerFootingResistance: '10',
    wireCoverage: '100',
    loadedNonUniform: false,
  };
}

const num = (value: string) => (value.trim() === '' ? NaN : Number(value));

const fmt = (value: number, decimals = 3) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '—';

const complexText = (value: ComplexValue, decimals = 2) =>
  `${fmt(value.magnitude, decimals)} ∠ ${fmt(value.angleDegrees, 1)}°`;

function toPayload(terminal: TerminalForm): RamezaniTerminalPayload | string {
  const label = terminal.name || 'ترمینال';
  const faultCurrent = { re: num(terminal.faultRe), im: num(terminal.faultIm) };
  const mutual = { re: num(terminal.mutualRe), im: num(terminal.mutualIm) };
  const spanCount = num(terminal.spanCount);
  const spanLength = num(terminal.spanLength);
  const footing = num(terminal.towerFootingResistance);
  const coverage = num(terminal.wireCoverage);

  const numbers = [faultCurrent.re, faultCurrent.im, mutual.re, mutual.im, spanLength, footing, coverage];
  if (numbers.some((value) => Number.isNaN(value)) || Number.isNaN(spanCount)) {
    return `${label}: همهٔ فیلدهای عددی را پر کنید.`;
  }
  if (!Number.isInteger(spanCount) || spanCount < 1 || spanCount > 200) {
    return `${label}: تعداد span باید عدد صحیح بین ۱ و ۲۰۰ باشد.`;
  }
  if (!(coverage > 0 && coverage <= 100)) {
    return `${label}: نسبت طول خط دارای سیم گارد باید بین ۰ و ۱۰۰٪ باشد.`;
  }

  let groundWire: RamezaniTerminalPayload['groundWire'];
  if (terminal.wireMode === 'CATALOG') {
    if (!terminal.groundWireId) return `${label}: یک سیم گارد انتخاب کنید.`;
    const rho = num(terminal.earthResistivity);
    if (Number.isNaN(rho)) return `${label}: مقاومت ویژهٔ خاک را وارد کنید.`;
    groundWire = {
      source: 'CATALOG',
      groundWireId: terminal.groundWireId,
      earthResistivity: rho,
      resistanceSource: terminal.resistanceSource,
      reactanceSource: terminal.reactanceSource,
    };
  } else {
    const impedance = { re: num(terminal.zgwRe), im: num(terminal.zgwIm) };
    if (Number.isNaN(impedance.re) || Number.isNaN(impedance.im)) {
      return `${label}: امپدانس سیم گارد را وارد کنید.`;
    }
    groundWire = { source: 'DIRECT', impedance };
  }

  return {
    name: terminal.name || undefined,
    faultCurrent,
    groundWire,
    mutualImpedance: mutual,
    spans: Array.from({ length: spanCount }, () => ({
      length: spanLength,
      towerFootingResistance: footing,
    })),
    groundWireFraction: coverage / 100,
  };
}

/** Rebuilds a terminal's form from a saved project's terminal (spans shown as means). */
function fromPayload(terminal: RamezaniTerminalPayload, index: number): TerminalForm {
  const base = newTerminal(index + 1);
  const wire = terminal.groundWire;
  const spans = terminal.spans;

  const meanLength = spans.reduce((sum, span) => sum + span.length, 0) / spans.length;
  const meanFooting =
    spans.reduce((sum, span) => sum + span.towerFootingResistance, 0) / spans.length;
  const uniform = spans.every(
    (span) =>
      span.length === spans[0].length &&
      span.towerFootingResistance === spans[0].towerFootingResistance
  );

  return {
    ...base,
    name: terminal.name ?? base.name,
    faultRe: String(terminal.faultCurrent.re),
    faultIm: String(terminal.faultCurrent.im),
    mutualRe: String(terminal.mutualImpedance.re),
    mutualIm: String(terminal.mutualImpedance.im),
    spanCount: String(spans.length),
    spanLength: String(Number(meanLength.toFixed(4))),
    towerFootingResistance: String(Number(meanFooting.toFixed(4))),
    wireCoverage: String(Number((terminal.groundWireFraction * 100).toFixed(2))),
    loadedNonUniform: !uniform,
    ...(wire.source === 'DIRECT'
      ? {
          wireMode: 'DIRECT' as const,
          zgwRe: String(wire.impedance.re),
          zgwIm: String(wire.impedance.im),
        }
      : {
          wireMode: 'CATALOG' as const,
          groundWireId: wire.groundWireId,
          earthResistivity: String(wire.earthResistivity),
          resistanceSource: wire.resistanceSource,
          reactanceSource: wire.reactanceSource,
        }),
  };
}

interface RamezaniSplitFactorFormProps {
  /** The ground wire catalog, shared with the page. */
  wires: GroundWire[];
}

/**
 * Ramezani ("Analytical") split factor: each line is a ladder of ground
 * wire spans and tower footings. This form takes equal spans per
 * terminal (count, length, footing resistance); the API takes any list.
 */
export function RamezaniSplitFactorForm({ wires }: RamezaniSplitFactorFormProps) {
  const [gridResistance, setGridResistance] = useState('0.3');
  const [faultLocation, setFaultLocation] = useState<'INSIDE' | 'VICINITY'>('INSIDE');
  const [igRe, setIgRe] = useState('0');
  const [igIm, setIgIm] = useState('0');
  const [terminals, setTerminals] = useState<TerminalForm[]>(() => [newTerminal(1)]);

  const [errors, setErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<RamezaniCalculationResult | null>(null);

  const updateTerminal = (key: number, patch: Partial<TerminalForm>) => {
    setTerminals((current) =>
      current.map((terminal) => (terminal.key === key ? { ...terminal, ...patch } : terminal))
    );
  };

  /** The form's input for a calculation or a saved project, or what is wrong with it. */
  const getInput = (): SplitInputSnapshot => {
    const rg = num(gridResistance);
    const payloads = terminals.map(toPayload);
    const problems = payloads.filter((payload): payload is string => typeof payload === 'string');
    if (Number.isNaN(rg)) problems.unshift('مقاومت شبکه زمین را وارد کنید.');

    const groundFaultCurrent =
      faultLocation === 'VICINITY'
        ? { re: num(igRe), im: num(igIm) }
        : { re: 0, im: 0 };
    if (Number.isNaN(groundFaultCurrent.re) || Number.isNaN(groundFaultCurrent.im)) {
      problems.unshift('جریان کل خطا (IG) را وارد کنید.');
    } else if (
      faultLocation === 'VICINITY' &&
      groundFaultCurrent.re === 0 &&
      groundFaultCurrent.im === 0
    ) {
      problems.unshift('برای خطا در نزدیکی پست، IG نباید صفر باشد.');
    }
    if (problems.length > 0) return { ok: false, problems };

    return {
      ok: true,
      input: {
        gridResistance: rg,
        groundFaultCurrent,
        terminals: payloads as RamezaniTerminalPayload[],
      },
    };
  };

  const applyInput = (input: Record<string, unknown>) => {
    const saved = input as {
      gridResistance?: number;
      groundFaultCurrent?: { re: number; im: number };
      terminals?: RamezaniTerminalPayload[];
    };
    if (
      typeof saved.gridResistance !== 'number' ||
      !Array.isArray(saved.terminals) ||
      saved.terminals.length === 0
    ) {
      setErrors(['ورودی ذخیره‌شدهٔ این پروژه قابل بارگذاری نیست.']);
      return;
    }

    setErrors([]);
    setResult(null);
    setGridResistance(String(saved.gridResistance));
    const ig = saved.groundFaultCurrent ?? { re: 0, im: 0 };
    setFaultLocation(ig.re === 0 && ig.im === 0 ? 'INSIDE' : 'VICINITY');
    setIgRe(String(ig.re));
    setIgIm(String(ig.im));
    setTerminals(saved.terminals.map(fromPayload));
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const snapshot = getInput();
    if (!snapshot.ok) {
      setErrors(snapshot.problems);
      return;
    }

    setErrors([]);
    setIsCalculating(true);
    try {
      setResult(
        await ramezaniApi.calculate(
          snapshot.input as Parameters<typeof ramezaniApi.calculate>[0]
        )
      );
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['محاسبه ناموفق بود.']);
    } finally {
      setIsCalculating(false);
    }
  };

  const field = (
    key: number,
    id: string,
    label: string,
    value: string,
    patch: (text: string) => Partial<TerminalForm>,
    step = 'any'
  ) => (
    <FormField
      id={`${id}-${key}`}
      label={label}
      type="number"
      step={step}
      dir="ltr"
      value={value}
      onChange={(e) => updateTerminal(key, patch(e.target.value))}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <SplitProjectsBar method="RAMEZANI" getInput={getInput} onLoad={applyInput} />

      <form onSubmit={handleCalculate} className="flex flex-col gap-5" noValidate>
        <ErrorBanner messages={errors} />

        <div className="flex max-w-xl flex-col gap-2">
          <div className="max-w-xs">
            <FormField
              id="ramezani-rg"
              label="مقاومت شبکه زمین Rg (Ω)"
              type="number"
              step="any"
              dir="ltr"
              value={gridResistance}
              onChange={(e) => setGridResistance(e.target.value)}
            />
          </div>
          <GridResistanceFromCase
            onUse={(value) => setGridResistance(String(Number(value.toFixed(4))))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            id="ramezani-location"
            label="محل خطا"
            value={faultLocation}
            onChange={(e) => setFaultLocation(e.target.value as 'INSIDE' | 'VICINITY')}
          >
            <option value="INSIDE">داخل پست</option>
            <option value="VICINITY">در نزدیکی پست (با جریان IG)</option>
          </SelectField>
          {faultLocation === 'VICINITY' && (
            <>
              <FormField
                id="ramezani-ig-re"
                label="جریان کل خطا IG – حقیقی (A)"
                type="number"
                step="any"
                dir="ltr"
                value={igRe}
                onChange={(e) => setIgRe(e.target.value)}
              />
              <FormField
                id="ramezani-ig-im"
                label="جریان کل خطا IG – موهومی (A)"
                type="number"
                step="any"
                dir="ltr"
                value={igIm}
                onChange={(e) => setIgIm(e.target.value)}
              />
            </>
          )}
        </div>

        {terminals.map((terminal, index) => (
          <fieldset
            key={terminal.key}
            className="rounded-xl border border-border-soft bg-surface p-5"
          >
            <legend className="px-2 text-sm font-semibold text-text">ترمینال {index + 1}</legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id={`rname-${terminal.key}`}
                label="نام"
                value={terminal.name}
                onChange={(e) => updateTerminal(terminal.key, { name: e.target.value })}
              />
              {field(terminal.key, 'rir', 'جریان خطا – حقیقی (A)', terminal.faultRe, (v) => ({ faultRe: v }))}
              {field(terminal.key, 'rii', 'جریان خطا – موهومی (A)', terminal.faultIm, (v) => ({ faultIm: v }))}
              {field(terminal.key, 'rcount', 'تعداد span', terminal.spanCount, (v) => ({ spanCount: v }), '1')}
              {field(terminal.key, 'rlen', 'طول هر span (m)', terminal.spanLength, (v) => ({ spanLength: v }))}
              {field(terminal.key, 'rrft', 'مقاومت پایه دکل (Ω)', terminal.towerFootingResistance, (v) => ({
                towerFootingResistance: v,
              }))}
              {field(terminal.key, 'rcov', 'درصد طول خط دارای سیم گارد', terminal.wireCoverage, (v) => ({
                wireCoverage: v,
              }))}
              {field(terminal.key, 'rzgmr', 'امپدانس متقابل Zgm – حقیقی (Ω/km)', terminal.mutualRe, (v) => ({
                mutualRe: v,
              }))}
              {field(terminal.key, 'rzgmi', 'امپدانس متقابل Zgm – موهومی (Ω/km)', terminal.mutualIm, (v) => ({
                mutualIm: v,
              }))}
            </div>

            {terminal.loadedNonUniform && (
              <p className="mt-3 text-xs text-copper-text">
                این پروژه span‌های نایکنواخت دارد؛ فرم میانگین طول و مقاومت را نشان می‌دهد و با
                ذخیرهٔ دوبارهٔ پروژه، span‌ها یکنواخت می‌شوند.
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField
                id={`rmode-${terminal.key}`}
                label="امپدانس سیم گارد"
                value={terminal.wireMode}
                onChange={(e) =>
                  updateTerminal(terminal.key, {
                    wireMode: e.target.value as TerminalForm['wireMode'],
                  })
                }
              >
                <option value="DIRECT">ورود مستقیم (Ω/km)</option>
                <option value="CATALOG" disabled={wires.length === 0}>
                  محاسبه از مشخصات سیم
                </option>
              </SelectField>

              {terminal.wireMode === 'DIRECT' ? (
                <>
                  {field(terminal.key, 'rzgwr', 'Zgw – حقیقی (Ω/km)', terminal.zgwRe, (v) => ({ zgwRe: v }))}
                  {field(terminal.key, 'rzgwi', 'Zgw – موهومی (Ω/km)', terminal.zgwIm, (v) => ({ zgwIm: v }))}
                </>
              ) : (
                <>
                  <SelectField
                    id={`rwire-${terminal.key}`}
                    label="سیم گارد"
                    value={terminal.groundWireId}
                    onChange={(e) => updateTerminal(terminal.key, { groundWireId: e.target.value })}
                  >
                    <option value="">— انتخاب —</option>
                    {wires.map((wire) => (
                      <option key={wire.id} value={wire.id}>
                        {wire.name}
                      </option>
                    ))}
                  </SelectField>
                  {field(terminal.key, 'rrho', 'مقاومت ویژه خاک ρ (Ω·m)', terminal.earthResistivity, (v) => ({
                    earthResistivity: v,
                  }))}
                  <SelectField
                    id={`rrsrc-${terminal.key}`}
                    label="مقاومت سیم"
                    value={terminal.resistanceSource}
                    onChange={(e) =>
                      updateTerminal(terminal.key, {
                        resistanceSource: e.target.value as ResistanceSource,
                      })
                    }
                  >
                    <option value="AC">AC (به‌علاوهٔ برگشت زمین)</option>
                    <option value="DC">DC</option>
                  </SelectField>
                  <SelectField
                    id={`rxsrc-${terminal.key}`}
                    label="راکتانس سیم"
                    value={terminal.reactanceSource}
                    onChange={(e) =>
                      updateTerminal(terminal.key, {
                        reactanceSource: e.target.value as ReactanceSource,
                      })
                    }
                  >
                    <option value="GMR">از GMR</option>
                    <option value="REACTANCE">از راکتانس داخلی</option>
                  </SelectField>
                </>
              )}
            </div>

            {terminals.length > 1 && (
              <div className="mt-4 text-left">
                <button
                  type="button"
                  onClick={() =>
                    setTerminals((current) => current.filter((t) => t.key !== terminal.key))
                  }
                  className="text-xs font-medium text-danger transition-colors hover:text-danger/80"
                >
                  حذف ترمینال
                </button>
              </div>
            )}
          </fieldset>
        ))}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTerminals((current) => [...current, newTerminal(current.length + 1)])}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint"
          >
            افزودن ترمینال
          </button>
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

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-text-faint">ضریب تقسیم جریان (Sf)</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular text-copper-text" dir="ltr">
                {fmt(result.splitFactor, 2)} %
              </p>
            </div>
            <div>
              <p className="text-xs text-text-faint">جریان وارد شبکه Ig</p>
              <p className="mt-1 font-mono text-sm tabular text-text" dir="ltr">
                {complexText(result.gridCurrent)} A
              </p>
            </div>
            <div>
              <p className="text-xs text-text-faint">مجموع جریان خطا ΣIr</p>
              <p className="mt-1 font-mono text-sm tabular text-text" dir="ltr">
                {complexText(result.totalFaultCurrent)} A
              </p>
            </div>
          </div>

          {result.warnings.map((warning) => (
            <p key={warning} role="alert" className="mt-3 text-xs text-copper-text">
              {warning}
            </p>
          ))}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-faint">
                  <th className="py-2 text-right font-medium">ترمینال</th>
                  <th className="py-2 text-center font-medium">طول خط (km)</th>
                  <th className="py-2 text-center font-medium">Ze (Ω)</th>
                  <th className="py-2 text-center font-medium">Ke</th>
                  <th className="py-2 text-center font-medium">Ie (A)</th>
                </tr>
              </thead>
              <tbody>
                {result.terminals.map((terminal, index) => (
                  <tr key={index} className="border-t border-border-soft">
                    <td className="py-2 text-text">{terminal.name ?? `ترمینال ${index + 1}`}</td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {fmt(terminal.lineLength, 3)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(terminal.equivalentImpedance)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(terminal.voltageCoefficient, 3)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(terminal.earthCurrent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <UseSplitFactorInCase splitFactorPercent={result.splitFactor} />
        </section>
      )}
    </div>
  );
}

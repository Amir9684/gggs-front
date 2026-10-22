import { useCallback, useEffect, useState } from 'react';

import { ErrorBanner } from '../../components/auth/ErrorBanner';
import { FormField } from '../../components/auth/FormField';
import { SelectField } from '../../components/auth/SelectField';
import { GroundWiresSection } from '../../components/split-factor/GroundWiresSection';
import { groundWiresApi, splitFactorApi } from '../../api/split-factor.api';
import { ApiError } from '../../types/api';
import type {
  ComplexValue,
  GroundWire,
  ReactanceSource,
  ResistanceSource,
  SoniCalculationResult,
  SoniTerminalPayload,
} from '../../types/split-factor';

/** One terminal of the form: everything is text until Calculate parses it. */
interface TerminalForm {
  key: number;
  name: string;
  faultRe: string;
  faultIm: string;
  spanLength: string;
  towerFootingResistance: string;
  wireMode: 'CATALOG' | 'DIRECT';
  groundWireId: string;
  earthResistivity: string;
  resistanceSource: ResistanceSource;
  reactanceSource: ReactanceSource;
  zgwRe: string;
  zgwIm: string;
  mutualRe: string;
  mutualIm: string;
}

let nextKey = 1;

/** Defaults follow the Windows split factor dialog. */
function newTerminal(index: number): TerminalForm {
  return {
    key: nextKey++,
    name: `ترمینال ${index}`,
    faultRe: '400',
    faultIm: '-500',
    spanLength: '500',
    towerFootingResistance: '10',
    wireMode: 'DIRECT',
    groundWireId: '',
    earthResistivity: '1000',
    resistanceSource: 'AC',
    reactanceSource: 'GMR',
    zgwRe: '',
    zgwIm: '',
    mutualRe: '0.00005',
    mutualIm: '0.00038',
  };
}

const num = (value: string) => (value.trim() === '' ? NaN : Number(value));

const fmt = (value: number, decimals = 3) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '—';

const complexText = (value: ComplexValue, decimals = 2) =>
  `${fmt(value.magnitude, decimals)} ∠ ${fmt(value.angleDegrees, 1)}°`;

function toPayload(terminal: TerminalForm): SoniTerminalPayload | string {
  const label = terminal.name || 'ترمینال';
  const faultCurrent = { re: num(terminal.faultRe), im: num(terminal.faultIm) };
  const mutual = { re: num(terminal.mutualRe), im: num(terminal.mutualIm) };

  const fields = [
    faultCurrent.re,
    faultCurrent.im,
    mutual.re,
    mutual.im,
    num(terminal.spanLength),
    num(terminal.towerFootingResistance),
  ];
  if (fields.some((value) => Number.isNaN(value))) {
    return `${label}: همهٔ فیلدهای عددی را پر کنید.`;
  }

  let groundWire: SoniTerminalPayload['groundWire'];
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
    spanLength: num(terminal.spanLength),
    towerFootingResistance: num(terminal.towerFootingResistance),
    groundWire,
    mutualImpedance: mutual,
  };
}

export function SplitFactorPage() {
  const [wires, setWires] = useState<GroundWire[]>([]);
  const [wiresLoading, setWiresLoading] = useState(true);

  const [gridResistance, setGridResistance] = useState('0.2');
  const [terminals, setTerminals] = useState<TerminalForm[]>(() => [newTerminal(1)]);

  const [errors, setErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<SoniCalculationResult | null>(null);

  const loadWires = useCallback(async () => {
    setWiresLoading(true);
    try {
      setWires(await groundWiresApi.getAll());
    } catch {
      // The calculator still works with a directly typed impedance.
      setWires([]);
    } finally {
      setWiresLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWires();
  }, [loadWires]);

  const updateTerminal = (key: number, patch: Partial<TerminalForm>) => {
    setTerminals((current) =>
      current.map((terminal) => (terminal.key === key ? { ...terminal, ...patch } : terminal))
    );
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const rg = num(gridResistance);
    const payloads = terminals.map(toPayload);
    const problems = payloads.filter((payload): payload is string => typeof payload === 'string');
    if (Number.isNaN(rg)) problems.unshift('مقاومت شبکه زمین را وارد کنید.');
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setErrors([]);
    setIsCalculating(true);
    try {
      setResult(
        await splitFactorApi.calculateSoni({
          gridResistance: rg,
          terminals: payloads as SoniTerminalPayload[],
        })
      );
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['محاسبه ناموفق بود.']);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-text">ضریب تقسیم جریان (Split Factor)</h1>
        <p className="mt-1 text-sm text-text-muted">
          روش تقریبی (Soni): سهمی از جریان خطا که به شبکهٔ زمین پست می‌رسد.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="flex flex-col gap-5" noValidate>
        <ErrorBanner messages={errors} />

        <div className="max-w-xs">
          <FormField
            id="gridResistance"
            label="مقاومت شبکه زمین Rg (Ω)"
            type="number"
            step="any"
            dir="ltr"
            value={gridResistance}
            onChange={(e) => setGridResistance(e.target.value)}
          />
        </div>

        {terminals.map((terminal, index) => (
          <fieldset
            key={terminal.key}
            className="rounded-xl border border-border-soft bg-surface p-5"
          >
            <legend className="px-2 text-sm font-semibold text-text">
              ترمینال {index + 1}
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id={`name-${terminal.key}`}
                label="نام"
                value={terminal.name}
                onChange={(e) => updateTerminal(terminal.key, { name: e.target.value })}
              />
              <FormField
                id={`span-${terminal.key}`}
                label="طول span (m)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.spanLength}
                onChange={(e) => updateTerminal(terminal.key, { spanLength: e.target.value })}
              />
              <FormField
                id={`rft-${terminal.key}`}
                label="مقاومت پایه دکل Rft (Ω)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.towerFootingResistance}
                onChange={(e) =>
                  updateTerminal(terminal.key, { towerFootingResistance: e.target.value })
                }
              />
              <FormField
                id={`ir-${terminal.key}`}
                label="جریان خطا – حقیقی (A)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.faultRe}
                onChange={(e) => updateTerminal(terminal.key, { faultRe: e.target.value })}
              />
              <FormField
                id={`ii-${terminal.key}`}
                label="جریان خطا – موهومی (A)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.faultIm}
                onChange={(e) => updateTerminal(terminal.key, { faultIm: e.target.value })}
              />
              <div />
              <FormField
                id={`zgmr-${terminal.key}`}
                label="امپدانس متقابل Zgm – حقیقی (Ω/m)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.mutualRe}
                onChange={(e) => updateTerminal(terminal.key, { mutualRe: e.target.value })}
              />
              <FormField
                id={`zgmi-${terminal.key}`}
                label="امپدانس متقابل Zgm – موهومی (Ω/m)"
                type="number"
                step="any"
                dir="ltr"
                value={terminal.mutualIm}
                onChange={(e) => updateTerminal(terminal.key, { mutualIm: e.target.value })}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField
                id={`mode-${terminal.key}`}
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
                  <FormField
                    id={`zgwr-${terminal.key}`}
                    label="Zgw – حقیقی (Ω/km)"
                    type="number"
                    step="any"
                    dir="ltr"
                    value={terminal.zgwRe}
                    onChange={(e) => updateTerminal(terminal.key, { zgwRe: e.target.value })}
                  />
                  <FormField
                    id={`zgwi-${terminal.key}`}
                    label="Zgw – موهومی (Ω/km)"
                    type="number"
                    step="any"
                    dir="ltr"
                    value={terminal.zgwIm}
                    onChange={(e) => updateTerminal(terminal.key, { zgwIm: e.target.value })}
                  />
                </>
              ) : (
                <>
                  <SelectField
                    id={`wire-${terminal.key}`}
                    label="سیم گارد"
                    value={terminal.groundWireId}
                    onChange={(e) =>
                      updateTerminal(terminal.key, { groundWireId: e.target.value })
                    }
                  >
                    <option value="">— انتخاب —</option>
                    {wires.map((wire) => (
                      <option key={wire.id} value={wire.id}>
                        {wire.name}
                      </option>
                    ))}
                  </SelectField>
                  <FormField
                    id={`rho-${terminal.key}`}
                    label="مقاومت ویژه خاک ρ (Ω·m)"
                    type="number"
                    step="any"
                    dir="ltr"
                    value={terminal.earthResistivity}
                    onChange={(e) =>
                      updateTerminal(terminal.key, { earthResistivity: e.target.value })
                    }
                  />
                  <SelectField
                    id={`rsrc-${terminal.key}`}
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
                    id={`xsrc-${terminal.key}`}
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

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-faint">
                  <th className="py-2 text-right font-medium">ترمینال</th>
                  <th className="py-2 text-center font-medium">Ze (Ω)</th>
                  <th className="py-2 text-center font-medium">Ie (A)</th>
                </tr>
              </thead>
              <tbody>
                {result.terminals.map((terminal, index) => (
                  <tr key={index} className="border-t border-border-soft">
                    <td className="py-2 text-text">{terminal.name ?? `ترمینال ${index + 1}`}</td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(terminal.equivalentImpedance)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(terminal.earthCurrent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <GroundWiresSection wires={wires} isLoading={wiresLoading} onChanged={loadWires} />
    </div>
  );
}

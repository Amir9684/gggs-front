import { useState } from 'react';

import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { SelectField } from '../auth/SelectField';
import { GridResistanceFromCase } from './GridResistanceFromCase';
import { SpansEditorModal } from './SpansEditorModal';
import { SplitProjectsBar, type SplitInputSnapshot } from './SplitProjectsBar';
import {
  isUniform,
  meanOf,
  parseRows,
  toRows,
  uniformRows,
  type SpanRow,
} from './spans';
import { UseSplitFactorInCase } from './UseSplitFactorInCase';
import { dawalibiApi } from '../../api/dawalibi.api';
import { ApiError } from '../../types/api';
import type {
  DawalibiCalculationResult,
  DawalibiLinePayload,
} from '../../types/dawalibi';
import type {
  ComplexValue,
  GroundWire,
  ReactanceSource,
  ResistanceSource,
} from '../../types/split-factor';

/** One line of the form: everything is text until Calculate parses it. */
interface LineForm {
  key: number;
  name: string;
  sourceRe: string;
  sourceIm: string;
  wireMode: 'CATALOG' | 'DIRECT';
  groundWireId: string;
  earthResistivity: string;
  resistanceSource: ResistanceSource;
  reactanceSource: ReactanceSource;
  zgwRe: string;
  zgwIm: string;
  mutualRe: string;
  mutualIm: string;
  /** Phase conductor impedance per span (ohm). */
  zaRe: string;
  zaIm: string;
  spanCount: string;
  spanLength: string;
  towerFootingResistance: string;
  /** Spans edited one by one; `null` means the equal spans above. */
  customSpans: SpanRow[] | null;
}

let nextKey = 1;

function newLine(index: number): LineForm {
  return {
    key: nextKey++,
    name: `خط ${index}`,
    sourceRe: '20000',
    sourceIm: '0',
    wireMode: 'DIRECT',
    groundWireId: '',
    earthResistivity: '1000',
    resistanceSource: 'AC',
    reactanceSource: 'GMR',
    zgwRe: '',
    zgwIm: '',
    mutualRe: '0.05',
    mutualIm: '0.38',
    zaRe: '0.1',
    zaIm: '0.425',
    spanCount: '20',
    spanLength: '300',
    towerFootingResistance: '10',
    customSpans: null,
  };
}

const num = (value: string) => (value.trim() === '' ? NaN : Number(value));

const fmt = (value: number, decimals = 3) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '—';

const complexText = (value: ComplexValue, decimals = 2) =>
  `${fmt(value.magnitude, decimals)} ∠ ${fmt(value.angleDegrees, 1)}°`;

function toPayload(line: LineForm): DawalibiLinePayload | string {
  const label = line.name || 'خط';
  const voltageSource = { re: num(line.sourceRe), im: num(line.sourceIm) };
  const mutual = { re: num(line.mutualRe), im: num(line.mutualIm) };
  const za = { re: num(line.zaRe), im: num(line.zaIm) };

  if ([voltageSource.re, voltageSource.im, mutual.re, mutual.im, za.re, za.im].some(Number.isNaN)) {
    return `${label}: همهٔ فیلدهای عددی را پر کنید.`;
  }
  if (voltageSource.re === 0 && voltageSource.im === 0) {
    return `${label}: منبع ولتاژ انتهای خط نباید صفر باشد.`;
  }

  let spans: Array<{ length: number; towerFootingResistance: number }>;
  if (line.customSpans) {
    const parsed = parseRows(line.customSpans, 2);
    if (!parsed.ok) return `${label}: ${parsed.problem}`;
    spans = parsed.spans;
  } else {
    const spanCount = num(line.spanCount);
    const spanLength = num(line.spanLength);
    const footing = num(line.towerFootingResistance);
    if ([spanCount, spanLength, footing].some(Number.isNaN)) {
      return `${label}: همهٔ فیلدهای عددی را پر کنید.`;
    }
    if (!Number.isInteger(spanCount) || spanCount < 2 || spanCount > 200) {
      return `${label}: تعداد span باید عدد صحیح بین ۲ و ۲۰۰ باشد.`;
    }
    spans = Array.from({ length: spanCount }, () => ({
      length: spanLength,
      towerFootingResistance: footing,
    }));
  }

  let groundWire: DawalibiLinePayload['groundWire'];
  if (line.wireMode === 'CATALOG') {
    if (!line.groundWireId) return `${label}: یک سیم گارد انتخاب کنید.`;
    const rho = num(line.earthResistivity);
    if (Number.isNaN(rho)) return `${label}: مقاومت ویژهٔ خاک را وارد کنید.`;
    groundWire = {
      source: 'CATALOG',
      groundWireId: line.groundWireId,
      earthResistivity: rho,
      resistanceSource: line.resistanceSource,
      reactanceSource: line.reactanceSource,
    };
  } else {
    const impedance = { re: num(line.zgwRe), im: num(line.zgwIm) };
    if (Number.isNaN(impedance.re) || Number.isNaN(impedance.im)) {
      return `${label}: امپدانس سیم گارد را وارد کنید.`;
    }
    groundWire = { source: 'DIRECT', impedance };
  }

  return {
    name: line.name || undefined,
    voltageSource,
    groundWire,
    mutualImpedance: mutual,
    phaseImpedancePerSpan: za,
    spans,
  };
}

/** Rebuilds a line's form from a saved project's line. */
function fromPayload(line: DawalibiLinePayload, index: number): LineForm {
  const base = newLine(index + 1);
  const wire = line.groundWire;
  const mean = meanOf(line.spans);
  const uniform = isUniform(line.spans);

  return {
    ...base,
    name: line.name ?? base.name,
    sourceRe: String(line.voltageSource.re),
    sourceIm: String(line.voltageSource.im),
    mutualRe: String(line.mutualImpedance.re),
    mutualIm: String(line.mutualImpedance.im),
    zaRe: String(line.phaseImpedancePerSpan.re),
    zaIm: String(line.phaseImpedancePerSpan.im),
    spanCount: String(line.spans.length),
    spanLength: String(Number(mean.length.toFixed(4))),
    towerFootingResistance: String(Number(mean.towerFootingResistance.toFixed(4))),
    customSpans: uniform ? null : toRows(line.spans),
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

interface DawalibiSplitFactorFormProps {
  /** The ground wire catalog, shared with the page. */
  wires: GroundWire[];
}

/**
 * Dawalibi ("Accurate") split factor: every line runs from the substation
 * to a remote substation with a voltage source behind it, and its ground
 * wire is a ladder of meshes. The arc current in the phase conductors
 * comes from the sources, so there is no fault current to type in.
 */
export function DawalibiSplitFactorForm({ wires }: DawalibiSplitFactorFormProps) {
  const [gridResistance, setGridResistance] = useState('0.5');
  const [lines, setLines] = useState<LineForm[]>(() => [newLine(1)]);

  const [errors, setErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<DawalibiCalculationResult | null>(null);
  const [editingKey, setEditingKey] = useState<number | null>(null);

  const updateLine = (key: number, patch: Partial<LineForm>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  /** The form's input for a calculation or a saved project, or what is wrong with it. */
  const getInput = (): SplitInputSnapshot => {
    const rg = num(gridResistance);
    const payloads = lines.map(toPayload);
    const problems = payloads.filter((payload): payload is string => typeof payload === 'string');
    if (Number.isNaN(rg)) problems.unshift('مقاومت شبکه زمین را وارد کنید.');
    if (problems.length > 0) return { ok: false, problems };

    return {
      ok: true,
      input: { gridResistance: rg, lines: payloads as DawalibiLinePayload[] },
    };
  };

  const applyInput = (input: Record<string, unknown>) => {
    const saved = input as { gridResistance?: number; lines?: DawalibiLinePayload[] };
    if (typeof saved.gridResistance !== 'number' || !Array.isArray(saved.lines) || saved.lines.length === 0) {
      setErrors(['ورودی ذخیره‌شدهٔ این پروژه قابل بارگذاری نیست.']);
      return;
    }

    setErrors([]);
    setResult(null);
    setGridResistance(String(saved.gridResistance));
    setLines(saved.lines.map(fromPayload));
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
        await dawalibiApi.calculate(snapshot.input as Parameters<typeof dawalibiApi.calculate>[0])
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
    patch: (text: string) => Partial<LineForm>,
    step = 'any',
    disabled = false
  ) => (
    <FormField
      id={`${id}-${key}`}
      label={label}
      type="number"
      step={step}
      dir="ltr"
      disabled={disabled}
      value={value}
      onChange={(e) => updateLine(key, patch(e.target.value))}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <SplitProjectsBar method="DAWALIBI" getInput={getInput} onLoad={applyInput} />

      <form onSubmit={handleCalculate} className="flex flex-col gap-5" noValidate>
        <ErrorBanner messages={errors} />

        <p className="text-xs text-text-muted">
          خطای قوس در پست رخ می‌دهد و جریان هر خط از منبع ولتاژ انتهای آن تأمین می‌شود. با
          یک خط تنها، ضریب تقسیم به مقدار منبع و Za بستگی ندارد؛ با چند خط، نسبت منابع
          و امپدانس خطوط سهم هر خط را تعیین می‌کند.
        </p>

        <div className="flex max-w-xl flex-col gap-2">
          <div className="max-w-xs">
            <FormField
              id="dawalibi-rg"
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

        {lines.map((line, index) => (
          <fieldset key={line.key} className="rounded-xl border border-border-soft bg-surface p-5">
            <legend className="px-2 text-sm font-semibold text-text">خط {index + 1}</legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id={`dname-${line.key}`}
                label="نام"
                value={line.name}
                onChange={(e) => updateLine(line.key, { name: e.target.value })}
              />
              {field(line.key, 'dvr', 'منبع ولتاژ Vk – حقیقی (V)', line.sourceRe, (v) => ({ sourceRe: v }))}
              {field(line.key, 'dvi', 'منبع ولتاژ Vk – موهومی (V)', line.sourceIm, (v) => ({ sourceIm: v }))}
              {field(line.key, 'dcount', 'تعداد span (حداقل ۲)', line.spanCount, (v) => ({ spanCount: v }), '1', !!line.customSpans)}
              {field(line.key, 'dlen', 'طول هر span (m)', line.spanLength, (v) => ({ spanLength: v }), 'any', !!line.customSpans)}
              {field(line.key, 'drft', 'مقاومت پایه دکل (Ω)', line.towerFootingResistance, (v) => ({
                towerFootingResistance: v,
              }), 'any', !!line.customSpans)}
              {field(line.key, 'dzgmr', 'امپدانس متقابل Zgm – حقیقی (Ω/km)', line.mutualRe, (v) => ({ mutualRe: v }))}
              {field(line.key, 'dzgmi', 'امپدانس متقابل Zgm – موهومی (Ω/km)', line.mutualIm, (v) => ({ mutualIm: v }))}
              <div />
              {field(line.key, 'dzar', 'امپدانس سیم فاز هر span Za – حقیقی (Ω)', line.zaRe, (v) => ({ zaRe: v }))}
              {field(line.key, 'dzai', 'امپدانس سیم فاز هر span Za – موهومی (Ω)', line.zaIm, (v) => ({ zaIm: v }))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingKey(line.key)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text-faint"
              >
                ویرایش تک‌تک spanها
              </button>
              {line.customSpans && (
                <>
                  <span className="text-xs text-copper-text">
                    {line.customSpans.length} span با مقادیر دستی
                  </span>
                  <button
                    type="button"
                    onClick={() => updateLine(line.key, { customSpans: null })}
                    className="text-xs text-text-faint underline transition-colors hover:text-text"
                  >
                    بازگشت به spanهای یکنواخت
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SelectField
                id={`dmode-${line.key}`}
                label="امپدانس سیم گارد"
                value={line.wireMode}
                onChange={(e) =>
                  updateLine(line.key, { wireMode: e.target.value as LineForm['wireMode'] })
                }
              >
                <option value="DIRECT">ورود مستقیم (Ω/km)</option>
                <option value="CATALOG" disabled={wires.length === 0}>
                  محاسبه از مشخصات سیم
                </option>
              </SelectField>

              {line.wireMode === 'DIRECT' ? (
                <>
                  {field(line.key, 'dzgwr', 'Zgw – حقیقی (Ω/km)', line.zgwRe, (v) => ({ zgwRe: v }))}
                  {field(line.key, 'dzgwi', 'Zgw – موهومی (Ω/km)', line.zgwIm, (v) => ({ zgwIm: v }))}
                </>
              ) : (
                <>
                  <SelectField
                    id={`dwire-${line.key}`}
                    label="سیم گارد"
                    value={line.groundWireId}
                    onChange={(e) => updateLine(line.key, { groundWireId: e.target.value })}
                  >
                    <option value="">— انتخاب —</option>
                    {wires.map((wire) => (
                      <option key={wire.id} value={wire.id}>
                        {wire.name}
                      </option>
                    ))}
                  </SelectField>
                  {field(line.key, 'drho', 'مقاومت ویژه خاک ρ (Ω·m)', line.earthResistivity, (v) => ({
                    earthResistivity: v,
                  }))}
                  <SelectField
                    id={`drsrc-${line.key}`}
                    label="مقاومت سیم"
                    value={line.resistanceSource}
                    onChange={(e) =>
                      updateLine(line.key, { resistanceSource: e.target.value as ResistanceSource })
                    }
                  >
                    <option value="AC">AC (به‌علاوهٔ برگشت زمین)</option>
                    <option value="DC">DC</option>
                  </SelectField>
                  <SelectField
                    id={`dxsrc-${line.key}`}
                    label="راکتانس سیم"
                    value={line.reactanceSource}
                    onChange={(e) =>
                      updateLine(line.key, { reactanceSource: e.target.value as ReactanceSource })
                    }
                  >
                    <option value="GMR">از GMR</option>
                    <option value="REACTANCE">از راکتانس داخلی</option>
                  </SelectField>
                </>
              )}
            </div>

            {lines.length > 1 && (
              <div className="mt-4 text-left">
                <button
                  type="button"
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  className="text-xs font-medium text-danger transition-colors hover:text-danger/80"
                >
                  حذف خط
                </button>
              </div>
            )}
          </fieldset>
        ))}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLines((current) => [...current, newLine(current.length + 1)])}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint"
          >
            افزودن خط
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
              <p className="text-xs text-text-faint">جریان وارد شبکه I0</p>
              <p className="mt-1 font-mono text-sm tabular text-text" dir="ltr">
                {complexText(result.gridCurrent)} A
              </p>
            </div>
            <div>
              <p className="text-xs text-text-faint">جریان کل خطا ΣIF</p>
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
                  <th className="py-2 text-right font-medium">خط</th>
                  <th className="py-2 text-center font-medium">طول (km)</th>
                  <th className="py-2 text-center font-medium">IF (A)</th>
                  <th className="py-2 text-center font-medium">I(1) (A)</th>
                  <th className="py-2 text-center font-medium">Ik (A)</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((line, index) => (
                  <tr key={index} className="border-t border-border-soft">
                    <td className="py-2 text-text">{line.name ?? `خط ${index + 1}`}</td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {fmt(line.lineLength, 3)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(line.lineCurrent)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(line.firstMeshCurrent)}
                    </td>
                    <td className="py-2 text-center font-mono tabular text-text" dir="ltr">
                      {complexText(line.remoteCurrent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <UseSplitFactorInCase splitFactorPercent={result.splitFactor} />
        </section>
      )}

      {editingKey !== null && (
        <SpansEditorModal
          title="ویرایش spanها"
          minimum={2}
          initialRows={(() => {
            const target = lines.find((l) => l.key === editingKey);
            if (!target) return [];
            if (target.customSpans) return target.customSpans;
            const count = Math.min(200, Math.max(2, Math.round(num(target.spanCount)) || 2));
            return uniformRows(count, target.spanLength, target.towerFootingResistance);
          })()}
          onClose={() => setEditingKey(null)}
          onSave={(rows) => {
            updateLine(editingKey, { customSpans: rows, spanCount: String(rows.length) });
            setEditingKey(null);
          }}
        />
      )}
    </div>
  );
}

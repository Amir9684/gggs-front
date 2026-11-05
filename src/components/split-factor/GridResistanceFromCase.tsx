import { useState } from 'react';

import { SelectField } from '../auth/SelectField';
import { calculationCasesApi } from '../../api/calculations.api';
import { ApiError } from '../../types/api';
import type { CalculationCase } from '../../types/calculation';

interface GridResistanceFromCaseProps {
  /** Puts the chosen Rg (ohm) into the calculator's resistance field. */
  onUse: (gridResistance: number) => void;
}

/**
 * Takes the substation's ground resistance Rg from the latest result of
 * one of the user's calculation cases. The Windows split factor module
 * does this with a built-in Galerkin ground-resistance form
 * (`SFGroundResisfrm`); here the case's own result is reused, so a
 * Galerkin case gives the same Rg the Windows form would.
 */
export function GridResistanceFromCase({ onUse }: GridResistanceFromCaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cases, setCases] = useState<CalculationCase[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [rg, setRg] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const open = async () => {
    setIsOpen(true);
    if (cases !== null) return;

    setIsBusy(true);
    try {
      setCases((await calculationCasesApi.getAll({ pageSize: 100 })).list);
    } catch {
      setCases([]);
      setMessage('بارگذاری کیس‌ها ناموفق بود.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setRg(null);
    setMessage(null);
    if (!id) return;

    setIsBusy(true);
    try {
      const result = await calculationCasesApi.getResults(id);
      const value = Number(result.gridResistance);
      if (Number.isFinite(value) && value > 0) {
        setRg(value);
      } else {
        setMessage('نتیجهٔ این کیس مقاومت شبکهٔ معتبری ندارد.');
      }
    } catch (err) {
      // A case that was never run has no result to take Rg from.
      setMessage(
        err instanceof ApiError ? err.messages[0] : 'دریافت نتیجهٔ کیس ناموفق بود.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={open}
        className="text-xs font-medium text-copper-text underline transition-colors hover:text-copper-hover"
      >
        گرفتن Rg از یک کیس محاسباتی
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <SelectField
            id="rg-from-case"
            label="کیس محاسباتی"
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
          >
            <option value="">— انتخاب کیس —</option>
            {(cases ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.project?.name ? `${item.project.name} — ` : ''}
                {item.name}
              </option>
            ))}
          </SelectField>
        </div>

        <button
          type="button"
          disabled={rg === null || isBusy}
          onClick={() => rg !== null && onUse(rg)}
          className="rounded-lg border border-copper/50 px-3 py-2 text-xs font-medium text-copper-text transition-colors hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rg === null ? 'استفاده از Rg کیس' : `استفاده از Rg = ${rg.toFixed(3)} Ω`}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-text-faint transition-colors hover:text-text"
        >
          بستن
        </button>
      </div>

      {isBusy && <p className="mt-2 text-xs text-text-faint">در حال بارگذاری…</p>}
      {message && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-text-faint">
        آخرین نتیجهٔ کیس به کار می‌رود. برای Rg دقیق‌تر شبکه، کیسی با روش گالرکین
        اجرا کنید.
      </p>
    </div>
  );
}

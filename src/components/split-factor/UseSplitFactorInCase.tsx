import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { SelectField } from '../auth/SelectField';
import { calculationCasesApi } from '../../api/calculations.api';
import { ApiError } from '../../types/api';
import type { CalculationCase } from '../../types/calculation';

interface UseSplitFactorInCaseProps {
  /** The computed split factor, in percent. */
  splitFactorPercent: number;
}

/**
 * Applies a computed split factor to the fault parameters of one of the
 * user's calculation cases. The case stores Sf as a fraction, so the
 * percent from the split factor methods is divided by 100.
 */
export function UseSplitFactorInCase({ splitFactorPercent }: UseSplitFactorInCaseProps) {
  const [cases, setCases] = useState<CalculationCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [appliedTo, setAppliedTo] = useState<CalculationCase | null>(null);

  useEffect(() => {
    let cancelled = false;
    calculationCasesApi
      .getAll({ pageSize: 100 })
      .then((result) => {
        if (!cancelled) setCases(result.list);
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A new computed value starts a new decision.
  useEffect(() => {
    setMessage(null);
    setAppliedTo(null);
  }, [splitFactorPercent]);

  // Sf is stored as a fraction in (0, 1]; a computed value above 100 % or
  // at 0 % cannot be applied.
  const fraction = splitFactorPercent / 100;
  const applicable = Number.isFinite(fraction) && fraction > 0 && fraction <= 1;

  const handleApply = async () => {
    const target = cases.find((item) => item.id === selectedId);
    if (!target) return;

    setIsApplying(true);
    setMessage(null);
    try {
      await calculationCasesApi.updateSplitFactor(target.id, fraction);
      setAppliedTo(target);
      setMessage({
        kind: 'ok',
        text: `ضریب تقسیم کیس «${target.name}» روی ${fraction.toFixed(4)} تنظیم شد. برای اعمال، محاسبهٔ کیس را دوباره اجرا کنید.`,
      });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof ApiError ? err.messages[0] : 'اعمال ضریب تقسیم در کیس ناموفق بود.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="mt-5 border-t border-border-soft pt-4">
      <h3 className="text-sm font-bold text-text">استفاده در کیس محاسباتی</h3>

      {cases.length === 0 ? (
        <p className="mt-2 text-xs text-text-faint">هنوز کیس محاسباتی‌ای وجود ندارد.</p>
      ) : !applicable ? (
        <p className="mt-2 text-xs text-text-faint">
          ضریب تقسیم باید بین ۰ و ۱۰۰٪ باشد تا در کیس ثبت شود.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <SelectField
              id="use-sf-case"
              label="کیس"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setMessage(null);
              }}
            >
              <option value="">— انتخاب کیس —</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.project?.name ? `${item.project.name} — ` : ''}
                  {item.name}
                  {item.fault ? ` (Sf فعلی: ${item.fault.splitFactor})` : ''}
                </option>
              ))}
            </SelectField>
          </div>
          <button
            type="button"
            disabled={!selectedId || isApplying}
            onClick={handleApply}
            className="rounded-lg border border-copper/50 px-4 py-2 text-sm font-medium text-copper-text transition-colors hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? 'در حال اعمال…' : `اعمال ${fraction.toFixed(4)} در کیس`}
          </button>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-xs ${message.kind === 'error' ? 'text-danger' : 'text-success'}`}
        >
          {message.text}{' '}
          {message.kind === 'ok' && appliedTo?.project?.id && (
            <Link
              to={`/projects/${appliedTo.project.id}/calculations/${appliedTo.id}`}
              className="font-medium text-copper-text underline"
            >
              رفتن به کیس
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

import { useState } from 'react';

import { Modal } from '../Modal';
import { ErrorBanner } from '../auth/ErrorBanner';
import { MAX_SPANS, parseRows, type SpanRow } from './spans';

interface SpansEditorModalProps {
  title: string;
  /** The rows to start from. */
  initialRows: SpanRow[];
  /** Fewest spans the method accepts. */
  minimum: number;
  onClose: () => void;
  onSave: (rows: SpanRow[]) => void;
}

const cellClass =
  'w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm font-mono tabular text-text focus:border-copper focus:outline-none';

/**
 * Per-span data of one line: the length of each span and the footing
 * resistance of the tower at its end ("Define Circuit" in the Windows app).
 */
export function SpansEditorModal({
  title,
  initialRows,
  minimum,
  onClose,
  onSave,
}: SpansEditorModalProps) {
  const [rows, setRows] = useState<SpanRow[]>(initialRows);
  const [errors, setErrors] = useState<string[]>([]);

  const update = (index: number, patch: Partial<SpanRow>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );

  const handleSave = () => {
    const parsed = parseRows(rows, minimum);
    if (!parsed.ok) {
      setErrors([parsed.problem]);
      return;
    }
    onSave(rows);
  };

  return (
    <Modal title={title} onClose={onClose} size="md">
      <div className="flex flex-col gap-3">
        <ErrorBanner messages={errors} />

        <p className="text-xs text-text-muted">
          هر ردیف یک span است، از پست به سمت بیرون. مقاومت پایه، مقاومت دکلِ انتهای
          همان span است و ردیف آخر پایهٔ انتهایی خط را نشان می‌دهد.
        </p>

        <div className="max-h-96 overflow-y-auto rounded-lg border border-border-soft">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-text-faint">
              <tr>
                <th className="w-10 py-2 text-center font-medium">#</th>
                <th className="py-2 text-center font-medium">طول (m)</th>
                <th className="py-2 text-center font-medium">مقاومت پایه (Ω)</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-border-soft">
                  <td className="py-1 text-center text-xs text-text-faint">{index + 1}</td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      aria-label={`طول span ${index + 1}`}
                      value={row.length}
                      onChange={(e) => update(index, { length: e.target.value })}
                      className={cellClass}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      aria-label={`مقاومت پایه span ${index + 1}`}
                      value={row.towerFootingResistance}
                      onChange={(e) => update(index, { towerFootingResistance: e.target.value })}
                      className={cellClass}
                    />
                  </td>
                  <td className="py-1 text-center">
                    <button
                      type="button"
                      disabled={rows.length <= minimum}
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      className="text-xs text-danger transition-colors hover:text-danger/80 disabled:opacity-40"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={rows.length >= MAX_SPANS}
            onClick={() =>
              setRows((current) => [
                ...current,
                { ...(current[current.length - 1] ?? { length: '300', towerFootingResistance: '10' }) },
              ])
            }
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text-faint disabled:opacity-60"
          >
            افزودن span (کپی ردیف آخر)
          </button>
          <button
            type="button"
            onClick={() =>
              setRows((current) => current.map(() => ({ ...current[0] })))
            }
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text-faint"
          >
            برابر کردن همه با ردیف اول
          </button>
          <span className="text-xs text-text-faint">{rows.length} span</span>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover"
          >
            ثبت spanها
          </button>
        </div>
      </div>
    </Modal>
  );
}

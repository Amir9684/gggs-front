import { useState } from 'react';

import { ConfirmDialog } from '../ConfirmDialog';
import { GroundWireFormModal } from './GroundWireFormModal';
import { groundWiresApi } from '../../api/split-factor.api';
import { ApiError } from '../../types/api';
import type { GroundWire } from '../../types/split-factor';

interface GroundWiresSectionProps {
  wires: GroundWire[];
  isLoading: boolean;
  /** Called after any create / edit / delete so the page reloads the list. */
  onChanged: () => void;
}

export function GroundWiresSection({ wires, isLoading, onChanged }: GroundWiresSectionProps) {
  const [formTarget, setFormTarget] = useState<'create' | GroundWire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroundWire | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (wire: GroundWire) => {
    try {
      await groundWiresApi.delete(wire.id);
      setDeleteTarget(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.messages[0] : 'حذف سیم گارد ناموفق بود.');
      throw err;
    }
  };

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-text">کاتالوگ سیم گارد</h2>
          <p className="mt-1 text-xs text-text-muted">
            مشخصات سیم‌ها را یک بار وارد کنید و در ترمینال‌ها انتخاب کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('create')}
          className="rounded-lg border border-copper/40 px-3 py-1.5 text-xs font-semibold text-copper-text transition-colors hover:border-copper"
        >
          سیم گارد جدید
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-text-muted">در حال بارگذاری…</p>
        ) : wires.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            هنوز سیم گاردی تعریف نشده است. می‌توانید امپدانس را مستقیم هم وارد کنید.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-faint">
                <th className="py-2 text-right font-medium">نام</th>
                <th className="py-2 text-center font-medium">Rac (Ω/km)</th>
                <th className="py-2 text-center font-medium">Rdc (Ω/km)</th>
                <th className="py-2 text-center font-medium">GMR (m)</th>
                <th className="py-2 text-center font-medium">X (Ω/km)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {wires.map((wire) => (
                <tr key={wire.id} className="border-t border-border-soft">
                  <td className="py-2 text-text">{wire.name}</td>
                  <td className="py-2 text-center font-mono tabular text-text" dir="ltr">{wire.acResistance}</td>
                  <td className="py-2 text-center font-mono tabular text-text" dir="ltr">{wire.dcResistance}</td>
                  <td className="py-2 text-center font-mono tabular text-text" dir="ltr">{wire.gmr}</td>
                  <td className="py-2 text-center font-mono tabular text-text" dir="ltr">{wire.reactance}</td>
                  <td className="py-2 text-left">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setFormTarget(wire)}
                        className="text-xs font-medium text-copper-text transition-colors hover:text-copper-hover"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(wire)}
                        className="text-xs font-medium text-danger transition-colors hover:text-danger/80"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formTarget && (
        <GroundWireFormModal
          wire={formTarget === 'create' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            setError(null);
            onChanged();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف سیم گارد"
          description={`سیم گارد «${deleteTarget.name}» حذف شود؟`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}

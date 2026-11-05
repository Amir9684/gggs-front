import { useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { SelectField } from '../auth/SelectField';
import { splitProjectsApi } from '../../api/split-projects.api';
import { ApiError } from '../../types/api';
import type { SplitMethod, SplitProject } from '../../types/split-project';

/** What a calculator hands the bar: its current input, or what is wrong with it. */
export type SplitInputSnapshot =
  | { ok: true; input: unknown }
  | { ok: false; problems: string[] };

interface SplitProjectsBarProps {
  method: SplitMethod;
  /** Reads and validates the calculator's current input. */
  getInput: () => SplitInputSnapshot;
  /** Puts a saved project's input back into the calculator. */
  onLoad: (input: Record<string, unknown>) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Save, load, update, calculate and delete saved split factor projects
 * of one method, for the calculator it sits in.
 */
export function SplitProjectsBar({ method, getInput, onLoad }: SplitProjectsBarProps) {
  const [projects, setProjects] = useState<SplitProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SplitProject | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await splitProjectsApi.getAll();
      setProjects(all.filter((project) => project.method === method));
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [method]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = projects.find((project) => project.id === selectedId) ?? null;

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      const message = await action();
      if (message) setNotice(message);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['عملیات ناموفق بود.']);
    } finally {
      setBusy(false);
    }
  };

  /** The calculator's input, or `null` after showing what is wrong with it. */
  const readInput = (): unknown | null => {
    const snapshot = getInput();
    if (!snapshot.ok) {
      setErrors(snapshot.problems);
      setNotice(null);
      return null;
    }
    return snapshot.input;
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      setErrors(['برای ذخیره، نام پروژه را وارد کنید.']);
      return;
    }
    const input = readInput();
    if (input === null) return;

    run(async () => {
      const created = await splitProjectsApi.create({ name, method, input });
      await load();
      setSelectedId(created.id);
      setNewName('');
      return `پروژه «${created.name}» ذخیره شد.`;
    });
  };

  const handleUpdate = () => {
    if (!selected) return;
    const input = readInput();
    if (input === null) return;

    run(async () => {
      await splitProjectsApi.update(selected.id, { input });
      await load();
      return `ورودی پروژه «${selected.name}» به‌روز شد (نتیجهٔ قبلی پاک شد).`;
    });
  };

  const handleLoad = () => {
    if (!selected) return;
    setErrors([]);
    setNotice(`پروژه «${selected.name}» در فرم بارگذاری شد.`);
    onLoad(selected.input);
  };

  const handleCalculate = () => {
    if (!selected) return;
    run(async () => {
      const done = await splitProjectsApi.calculate(selected.id);
      await load();
      const warnings = done.lastResult?.details.warnings;
      if (Array.isArray(warnings) && warnings.length > 0) {
        setErrors(warnings.map(String));
      }
      return done.lastResult
        ? `ضریب تقسیم پروژه «${selected.name}»: ${done.lastResult.splitFactor.toFixed(2)} %`
        : 'محاسبه انجام شد.';
    });
  };

  const handleReport = () => {
    if (!selected) return;
    run(async () => {
      await splitProjectsApi.downloadReport(selected.id, selected.name);
    });
  };

  const handleDelete = async (project: SplitProject) => {
    try {
      await splitProjectsApi.delete(project.id);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['حذف پروژه ناموفق بود.']);
      throw err;
    }
    setDeleteTarget(null);
    if (selectedId === project.id) setSelectedId('');
    await load();
  };

  const smallButton =
    'rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-text-faint disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-5">
      <h2 className="font-bold text-text">پروژه‌های ذخیره‌شده</h2>
      <p className="mt-1 text-xs text-text-muted">
        ورودی‌های فعلی فرم را ذخیره کنید و بعداً دوباره بارگذاری یا محاسبه کنید.
      </p>

      <div className="mt-3">
        <ErrorBanner messages={errors} />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <FormField
            id={`split-project-name-${method}`}
            label="نام پروژهٔ جدید"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <button type="button" disabled={busy} onClick={handleCreate} className={smallButton}>
          ذخیره به‌عنوان پروژهٔ جدید
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <SelectField
            id={`split-project-select-${method}`}
            label={isLoading ? 'در حال بارگذاری…' : 'پروژهٔ ذخیره‌شده'}
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setNotice(null);
            }}
          >
            <option value="">— انتخاب پروژه —</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.lastResult
                  ? ` (Sf: ${project.lastResult.splitFactor.toFixed(2)} %)`
                  : ''}
              </option>
            ))}
          </SelectField>
        </div>
        <button type="button" disabled={!selected || busy} onClick={handleLoad} className={smallButton}>
          بارگذاری در فرم
        </button>
        <button type="button" disabled={!selected || busy} onClick={handleUpdate} className={smallButton}>
          به‌روزرسانی با ورودی فعلی
        </button>
        <button type="button" disabled={!selected || busy} onClick={handleCalculate} className={smallButton}>
          محاسبه و ذخیرهٔ نتیجه
        </button>
        <button type="button" disabled={!selected || busy} onClick={handleReport} className={smallButton}>
          دانلود گزارش PDF
        </button>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={() => selected && setDeleteTarget(selected)}
          className="text-xs font-medium text-danger transition-colors hover:text-danger/80 disabled:opacity-60"
        >
          حذف
        </button>
      </div>

      {selected?.lastResult && (
        <p className="mt-3 text-xs text-text-muted">
          آخرین نتیجه: {selected.lastResult.splitFactor.toFixed(2)} % —{' '}
          {formatDate(selected.lastResult.computedAt)}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-xs text-success">
          {notice}
        </p>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف پروژه"
          description={`پروژهٔ «${deleteTarget.name}» حذف شود؟`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}

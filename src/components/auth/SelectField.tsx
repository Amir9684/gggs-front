import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, id, children, ...selectProps },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        ref={ref}
        className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text transition-colors outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
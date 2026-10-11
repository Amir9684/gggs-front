import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, error, id, ...inputProps }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text transition-colors outline-none focus:ring-2 focus:ring-copper-soft"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {error && (
          <p id={`${id}-error`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);
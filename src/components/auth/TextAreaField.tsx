import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, id, ...textareaProps }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <textarea
          id={id}
          ref={ref}
          rows={3}
          className="resize-none rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint transition-colors outline-none focus:border-copper focus:ring-2 focus:ring-copper-soft"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...textareaProps}
        />
        {error && (
          <p id={`${id}-error`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
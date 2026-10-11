import { useState } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If it throws, the dialog stays open so the caller can surface the error. */
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'حذف',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-text-muted">{description}</p>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'در حال حذف…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
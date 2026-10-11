import { useEffect, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Slightly wider variant for forms with several fields. */
  size?: "sm" | "md";
}

/**
 * Bare-bones dialog: backdrop click / Escape both close it, focus stays
 * wherever the caller puts it (form fields autoFocus their first input).
 * Not a full focus trap — fine for this app's scope, revisit if we ever
 * need to be strict about a11y modal semantics.
 */
export function Modal({ title, onClose, children, size = "sm" }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-xl border border-border-soft bg-surface p-6 shadow-xl ${
          size === "md" ? "max-w-lg" : "max-w-sm"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="modal-title" className="text-base font-bold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-md p-1 text-text-faint transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-150 px-2 pl-3">{children}</div>
      </div>
    </div>
  );
}

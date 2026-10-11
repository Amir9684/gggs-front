import { useState } from "react";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { reportsApi } from "../../api/reports.api";
import { ApiError } from "../../types/api";

interface GenerateReportModalProps {
  resultId: string;
  /** Prefilled default name, e.g. the calculation case's name. */
  defaultName?: string;
  onClose: () => void;
  onGenerated: () => void;
}

export function GenerateReportModal({
  resultId,
  defaultName,
  onClose,
  onGenerated,
}: GenerateReportModalProps) {
  const [name, setName] = useState(defaultName ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiErrors([]);
    setIsSubmitting(true);
    try {
      await reportsApi.generate({
        resultId,
        name: name.trim() || undefined,
      });
      onGenerated();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError ? err.messages : ["تولید گزارش ناموفق بود."],
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="تولید گزارش" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="reportName"
          label="نام گزارش (اختیاری)"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint disabled:cursor-not-allowed disabled:opacity-60"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "در حال تولید…" : "تولید گزارش"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
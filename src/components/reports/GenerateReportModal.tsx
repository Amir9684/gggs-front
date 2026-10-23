import { useState } from "react";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { SelectField } from "../auth/SelectField";
import { reportsApi } from "../../api/reports.api";
import { ApiError } from "../../types/api";
import type {
  DesignMethod,
  SoilLayeringMethod,
} from "../../types/design-method";
import {
  CONCRETE_REPORT_TEMPLATES,
  HALF_SECOND,
  REPORT_TEMPLATE_LABELS_FA,
  resolveReportTemplate,
  type ConcreteReportTemplate,
} from "../../types/report";

interface GenerateReportModalProps {
  resultId: string;
  /** Prefilled default name, e.g. the calculation case's name. */
  defaultName?: string;
  /** The case's method and layering: they decide which template fits. */
  designMethod: DesignMethod;
  soilLayering: SoilLayeringMethod | null;
  /** Fault duration (s); the 0.5 s option only applies from 0.5 s up. */
  faultDuration?: number;
  onClose: () => void;
  onGenerated: () => void;
}

export function GenerateReportModal({
  resultId,
  defaultName,
  designMethod,
  soilLayering,
  faultDuration,
  onClose,
  onGenerated,
}: GenerateReportModalProps) {
  // Only the template that matches the case can show the stored result's
  // numbers, so it is the one selectable entry; the others are listed
  // disabled so the choice is visible. `null` for Galerkin (no report yet).
  const matching = resolveReportTemplate(designMethod, soilLayering);
  const canUseHalfSecond =
    faultDuration !== undefined && faultDuration >= HALF_SECOND;

  const [name, setName] = useState(defaultName ?? "");
  const [template, setTemplate] = useState<ConcreteReportTemplate | "">(
    matching ?? ""
  );
  const [includeDetails, setIncludeDetails] = useState(true);
  const [halfSecond, setHalfSecond] = useState(canUseHalfSecond);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    setApiErrors([]);
    setIsSubmitting(true);
    try {
      await reportsApi.generate({
        resultId,
        name: name.trim() || undefined,
        template,
        includeDetails,
        // Only sent when the option applies; the server refuses it for a
        // shorter fault, and otherwise follows the fault duration itself.
        halfSecondVariant: canUseHalfSecond ? halfSecond : undefined,
      });
      onGenerated();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError ? err.messages : ["تولید گزارش ناموفق بود."]
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

        <SelectField
          id="reportTemplate"
          label="قالب گزارش"
          value={template}
          onChange={(e) =>
            setTemplate(e.target.value as ConcreteReportTemplate | "")
          }
        >
          {matching === null && <option value="">— —</option>}
          {CONCRETE_REPORT_TEMPLATES.map((option) => (
            <option key={option} value={option} disabled={option !== matching}>
              {REPORT_TEMPLATE_LABELS_FA[option]}
            </option>
          ))}
        </SelectField>
        {matching === null ? (
          <p className="-mt-2 text-xs text-danger">
            برای روش گالرکین هنوز قالب گزارشی وجود ندارد.
          </p>
        ) : (
          <p className="-mt-2 text-xs text-text-muted">
            قالب با روش طراحی و لایه‌بندی خاک این کیس تعیین می‌شود.
          </p>
        )}

        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={includeDetails}
            onChange={(e) => setIncludeDetails(e.target.checked)}
            className="mt-1 accent-copper"
          />
          <span>
            شامل مقادیر میانی و روش محاسبه
            <span className="block text-xs text-text-muted">
              هادی، Cs، Km، Ks، Ki، Kh، n و فرمول‌های محاسبه. خاموش: گزارش کوتاه
              با ورودی‌ها، نتایج و نمودارها.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-2 text-sm ${
            canUseHalfSecond ? "text-text" : "text-text-faint"
          }`}
        >
          <input
            type="checkbox"
            checked={canUseHalfSecond && halfSecond}
            disabled={!canUseHalfSecond}
            onChange={(e) => setHalfSecond(e.target.checked)}
            className="mt-1 accent-copper"
          />
          <span>
            نمایش مدت زمان خطا به صورت «۰٫۵ ثانیه یا بیشتر»
            <span className="block text-xs text-text-muted">
              {canUseHalfSecond
                ? "فاکتور کاهنده برابر ۱٫۰ است."
                : "فقط برای مدت زمان خطای ۰٫۵ ثانیه یا بیشتر."}
            </span>
          </span>
        </label>

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
            disabled={isSubmitting || !template}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "در حال تولید…" : "تولید گزارش"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

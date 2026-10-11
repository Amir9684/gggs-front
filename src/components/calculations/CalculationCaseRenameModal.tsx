import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { TextAreaField } from "../auth/TextAreaField";
import { calculationCasesApi } from "../../api/calculations.api";
import { ApiError } from "../../types/api";
import type { CalculationCase } from "../../types/calculation";
import {
  calculationCaseRenameSchema,
  type CalculationCaseRenameInput,
  type CalculationCaseRenameValues,
} from "../../schemas/calculation.schema";

interface CalculationCaseRenameModalProps {
  calculationCase: CalculationCase;
  onClose: () => void;
  onSaved: () => void;
}

export function CalculationCaseRenameModal({
  calculationCase,
  onClose,
  onSaved,
}: CalculationCaseRenameModalProps) {
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CalculationCaseRenameInput, unknown, CalculationCaseRenameValues>({
    resolver: zodResolver(calculationCaseRenameSchema),
    defaultValues: {
      name: calculationCase.name,
      description: calculationCase.description ?? "",
    },
  });

  const onSubmit = async (values: CalculationCaseRenameValues) => {
    setApiErrors([]);
    try {
      await calculationCasesApi.update(calculationCase.id, {
        id: calculationCase.id,
        ...values,
      });
      onSaved();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError
          ? err.messages
          : ["ذخیرهٔ کیس محاسباتی ناموفق بود."],
      );
    }
  };

  return (
    <Modal title="ویرایش کیس محاسباتی" onClose={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="name"
          label="نام کیس محاسباتی"
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <TextAreaField
          id="description"
          label="توضیحات (اختیاری)"
          error={errors.description?.message}
          {...register("description")}
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
            {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
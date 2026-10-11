import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { gridsApi } from "../../api/grids.api";
import { ApiError } from "../../types/api";
import type { Grid } from "../../types/grid";
import {
  gridSchema,
  type GridFormInput,
  type GridFormValues,
} from "../../schemas/grid.schema";

interface GridFormModalProps {
  projectId: string;
  /** Present → edit mode; absent → create mode. */
  grid?: Grid;
  onClose: () => void;
  onSaved: () => void;
}

export function GridFormModal({
  projectId,
  grid,
  onClose,
  onSaved,
}: GridFormModalProps) {
  const isEdit = !!grid;
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<GridFormInput, unknown, GridFormValues>({
    resolver: zodResolver(gridSchema),
    defaultValues: isEdit
      ? {
          name: grid.name,
          length: grid.length,
          width: grid.width,
          burialDepth: grid.burialDepth,
        }
      : {
          name: "",
          length: undefined,
          width: undefined,
          burialDepth: undefined,
        },
  });

  console.log(watch());

  const onSubmit = async (values: GridFormValues) => {
    setApiErrors([]);
    try {
      if (isEdit) {
        await gridsApi.update(grid.id, { id: grid.id, ...values });
      } else {
        await gridsApi.create({ projectId, ...values });
      }
      onSaved();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError ? err.messages : ["ذخیرهٔ شبکه ناموفق بود."]
      );
    }
  };

  return (
    <Modal
      title={isEdit ? "ویرایش شبکه" : "شبکهٔ جدید"}
      onClose={onClose}
      size="md"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="name"
          label="نام شبکه"
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            id="length"
            label="طول (m)"
            type="number"
            step="any"
            inputMode="decimal"
            error={errors.length?.message}
            {...register("length", { valueAsNumber: true })}
          />
          <FormField
            id="width"
            label="عرض (m)"
            type="number"
            step="any"
            inputMode="decimal"
            error={errors.width?.message}
            {...register("width", { valueAsNumber: true })}
          />
          <FormField
            id="burialDepth"
            label="عمق دفن (m)"
            type="number"
            step="any"
            inputMode="decimal"
            error={errors.burialDepth?.message}
            {...register("burialDepth", { valueAsNumber: true })}
          />
        </div>

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
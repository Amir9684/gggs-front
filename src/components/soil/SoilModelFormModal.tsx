import { useState } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { soilModelsApi } from "../../api/soil.api";
import { ApiError } from "../../types/api";
import type { SoilModel } from "../../types/soil";
import {
  soilModelSchema,
  type SoilModelFormInput,
  type SoilModelFormValues,
} from "../../schemas/soil.schema";

interface SoilModelFormModalProps {
  projectId: string;
  /** Present → edit mode; absent → create mode. */
  soilModel?: SoilModel;
  onClose: () => void;
  onSaved: () => void;
}

export function SoilModelFormModal({
  projectId,
  soilModel,
  onClose,
  onSaved,
}: SoilModelFormModalProps) {
  const isEdit = !!soilModel;
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SoilModelFormInput, unknown, SoilModelFormValues>({
    resolver: zodResolver(soilModelSchema),
    defaultValues: isEdit
      ? {
          name: soilModel.name,
          surfaceResistivity: soilModel.surfaceResistivity,
          layers: [...(soilModel.layers ?? [])]
            .sort((a, b) => a.layerOrder - b.layerOrder)
            .map((l) => ({
              id: l.id,
              resistivity: l.resistivity,
              thickness: l.thickness,
            })),
        }
      : {
          name: "",
          surfaceResistivity: undefined,
          layers: [{ resistivity: undefined, thickness: undefined }],
        },
  });

  console.log(watch());

  const { fields, append, remove } = useFieldArray<SoilModelFormInput>({
    control,
    name: "layers",
  });

  const onSubmit: SubmitHandler<SoilModelFormValues> = async (values) => {
    setApiErrors([]);
    const layers = values.layers.map((layer, index) => ({
      ...layer,
      layerOrder: index + 1,
    }));
    try {
      if (isEdit) {
        await soilModelsApi.update(soilModel.id, {
          id: soilModel.id,
          ...values,
          layers,
        });
      } else {
        await soilModelsApi.create({ projectId, ...values, layers });
      }
      onSaved();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError ? err.messages : ["ذخیرهٔ مدل خاک ناموفق بود."]
      );
    }
  };

  return (
    <Modal
      title={isEdit ? "ویرایش مدل خاک" : "مدل خاک جدید"}
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
          label="نام مدل خاک"
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />

        <FormField
          id="surfaceResistivity"
          label="مقاومت ویژهٔ لایهٔ سطحی (Ω·m)"
          type="number"
          step="any"
          inputMode="decimal"
          error={errors.surfaceResistivity?.message}
          {...register("surfaceResistivity", {
            valueAsNumber: true,
          })}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">
              لایه‌های خاک (از سطح به عمق)
            </span>
            <button
              type="button"
              onClick={() => append({ resistivity: 0, thickness: 0 })}
              className="text-xs font-medium text-copper-text transition-colors hover:text-copper-hover"
            >
              + افزودن لایه
            </button>
          </div>

          <p className="text-xs text-text-faint">
            برای خاک دولایه (IEEE) دقیقاً دو لایه تعریف کنید: لایهٔ اول لایهٔ
            بالایی با مقاومت ρ1 و ضخامت h1 است و لایهٔ دوم، لایهٔ پایینی با
            مقاومت ρ2.
          </p>

          {errors.layers?.root?.message && (
            <p className="text-xs text-danger">{errors.layers.root.message}</p>
          )}
          {errors.layers?.message && (
            <p className="text-xs text-danger">{errors.layers.message}</p>
          )}

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-2 rounded-lg border border-border-soft bg-surface-2 p-3"
              >
                <span className="pb-2.5 font-mono text-xs text-text-faint">
                  {fields.length === 2 ? (index === 0 ? "ρ1" : "ρ2") : index + 1}
                </span>
                <div className="flex-1">
                  <FormField
                    id={`layers.${index}.resistivity`}
                    label="مقاومت ویژه (Ω·m)"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    error={errors.layers?.[index]?.resistivity?.message}
                    {...register(`layers.${index}.resistivity`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="flex-1">
                  <FormField
                    id={`layers.${index}.thickness`}
                    label="ضخامت (m)"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    error={errors.layers?.[index]?.thickness?.message}
                    {...register(`layers.${index}.thickness`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label="حذف لایه"
                  className="mb-0.5 rounded-md border border-border px-2.5 py-2.5 text-xs text-text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
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

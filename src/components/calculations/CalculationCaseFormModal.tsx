import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Modal } from "../Modal";
import { ErrorBanner } from "../auth/ErrorBanner";
import { FormField } from "../auth/FormField";
import { SelectField } from "../auth/SelectField";
import { TextAreaField } from "../auth/TextAreaField";
import { calculationCasesApi } from "../../api/calculations.api";
import { gridsApi } from "../../api/grids.api";
import { soilModelsApi } from "../../api/soil.api";
import { ApiError } from "../../types/api";
import type { Grid } from "../../types/grid";
import type { SoilModel } from "../../types/soil";
import {
  DesignMethod,
  SoilLayeringMethod,
  DESIGN_METHOD_LABELS_FA,
  SOIL_LAYERING_LABELS_FA,
} from "../../types/design-method";
import {
  ConductorMaterial,
  CONDUCTOR_MATERIAL_LABELS_FA,
} from "../../types/conductor-material";
import { calculateConductorSizing } from "../../lib/conductor-sizing";
import { setConductorSizing } from "../../lib/conductor-material-store";
import { deriveDecrementFactor } from "../../lib/decrement-factor";
import {
  calculationCaseSchema,
  type CalculationCaseFormInput,
  type CalculationCaseFormValues,
} from "../../schemas/calculation.schema";

interface CalculationCaseFormModalProps {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create-only (calculation cases aren't editable beyond name/description —
 * see `CalculationCaseRenameModal` for that). Needs the project's grids and
 * soil models to populate the two selects, so it fetches both on mount.
 */
export function CalculationCaseFormModal({
  projectId,
  onClose,
  onSaved,
}: CalculationCaseFormModalProps) {
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const [grids, setGrids] = useState<Grid[]>([]);
  const [soilModels, setSoilModels] = useState<SoilModel[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);
      try {
        const [gridsResult, soilModelsResult] = await Promise.all([
          gridsApi.getAll({ projectId, pageSize: 100 }),
          soilModelsApi.getAll({ projectId, pageSize: 100 }),
        ]);
        if (cancelled) return;
        setGrids(gridsResult.list);
        setSoilModels(soilModelsResult.list);
      } catch (err) {
        if (cancelled) return;
        setOptionsError(
          err instanceof ApiError
            ? err.messages[0]
            : "دریافت شبکه‌ها و مدل‌های خاک ناموفق بود."
        );
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CalculationCaseFormInput, unknown, CalculationCaseFormValues>({
    resolver: zodResolver(calculationCaseSchema),
    defaultValues: {
      gridId: "",
      soilModelId: "",
      name: "",
      description: "",
      fault: {
        faultCurrent: undefined,
        faultDuration: undefined,
        splitFactor: undefined,
        decrementFactor: undefined,
        shockDuration: undefined,
      },
      settings: {
        surfaceLayerResistivity: undefined,
        surfaceLayerThickness: undefined,
        bodyWeight: undefined,
        frequency: undefined,
      },
      designMethod: {
        method: DesignMethod.IEEE_80_2000,
        soilLayering: SoilLayeringMethod.ONE_LAYER,
      },
      conductorSizing: {
        material: ConductorMaterial.COPPER_CLAD_STEEL_WIRE,
        ambientTempC: 40,
      },
    },
  });

  // Only IEEE 80-2000 has a one-layer/two-layer submenu in the demo — show
  // the sub-select for it and clear it out of the payload otherwise.
  const selectedMethod = watch("designMethod.method");

  // Live permissible-area preview as the user fills in fault current/
  // duration and picks a material — same inputs the sizing engine needs.
  const watchedFaultCurrent = watch("fault.faultCurrent");
  const watchedFaultDuration = watch("fault.faultDuration");
  const watchedDecrementFactor = watch("fault.decrementFactor");
  const watchedMaterial = watch("conductorSizing.material");
  const watchedAmbientTemp = watch("conductorSizing.ambientTempC");

  const sizingPreview =
    typeof watchedFaultCurrent === "number" &&
    watchedFaultCurrent > 0 &&
    typeof watchedFaultDuration === "number" &&
    watchedFaultDuration > 0 &&
    watchedMaterial &&
    typeof watchedAmbientTemp === "number"
      ? calculateConductorSizing({
          faultCurrentKA: watchedFaultCurrent / 1000,
          faultDurationS: watchedFaultDuration,
          material: watchedMaterial,
          ambientTempC: watchedAmbientTemp,
        })
      : null;

  // Df the backend will use: the typed override when there is one,
  // otherwise the value derived from the fault duration.
  const hasDecrementOverride =
    typeof watchedDecrementFactor === "number" &&
    Number.isFinite(watchedDecrementFactor);
  const derivedDecrementFactor = deriveDecrementFactor(watchedFaultDuration);

  const onSubmit: SubmitHandler<CalculationCaseFormValues> = async (values) => {
    setApiErrors([]);
    try {
      // `conductorSizing` still has no home on the backend (see
      // `types/conductor-material.ts`) — keep that out of the payload and
      // stash it client-side. `designMethod` is sent for real now that
      // `CalculationCase.designMethod`/`soilLayering` exist on the server.
      // `fault.decrementFactor` is left out of the JSON when empty, so the
      // backend derives it from `fault.faultDuration`.
      const { conductorSizing, ...payload } = values;
      const created = await calculationCasesApi.create({
        projectId,
        ...payload,
      });
      const sizing = calculateConductorSizing({
        faultCurrentKA: values.fault.faultCurrent / 1000,
        faultDurationS: values.fault.faultDuration,
        material: conductorSizing.material,
        ambientTempC: conductorSizing.ambientTempC,
      });
      setConductorSizing(created.id, {
        material: conductorSizing.material,
        ambientTempC: conductorSizing.ambientTempC,
        ...sizing,
      });
      onSaved();
    } catch (err) {
      setApiErrors(
        err instanceof ApiError
          ? err.messages
          : ["ذخیرهٔ کیس محاسباتی ناموفق بود."]
      );
    }
  };

  return (
    <Modal title="کیس محاسباتی جدید" onClose={onClose} size="md">
      {isLoadingOptions ? (
        <p className="text-xs text-text-faint">در حال بارگذاری…</p>
      ) : optionsError ? (
        <ErrorBanner messages={[optionsError]} />
      ) : grids.length === 0 || soilModels.length === 0 ? (
        <p className="text-xs text-text-faint">
          برای ساخت کیس محاسباتی، پروژه باید حداقل یک شبکه و یک مدل خاک داشته
          باشد.
        </p>
      ) : (
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="gridId"
              label="شبکه"
              error={errors.gridId?.message}
              {...register("gridId")}
            >
              <option value="">انتخاب کنید…</option>
              {grids.map((grid) => (
                <option key={grid.id} value={grid.id}>
                  {grid.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="soilModelId"
              label="مدل خاک"
              error={errors.soilModelId?.message}
              {...register("soilModelId")}
            >
              <option value="">انتخاب کنید…</option>
              {soilModels.map((soilModel) => (
                <option key={soilModel.id} value={soilModel.id}>
                  {soilModel.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="designMethod.method"
                label="روش طراحی"
                error={errors.designMethod?.method?.message}
                {...register("designMethod.method")}
              >
                {Object.values(DesignMethod).map((method) => (
                  <option key={method} value={method}>
                    {DESIGN_METHOD_LABELS_FA[method]}
                  </option>
                ))}
              </SelectField>

              {selectedMethod === DesignMethod.IEEE_80_2000 && (
                <SelectField
                  id="designMethod.soilLayering"
                  label="لایه‌بندی خاک"
                  error={errors.designMethod?.soilLayering?.message}
                  {...register("designMethod.soilLayering")}
                >
                  {Object.values(SoilLayeringMethod).map((layering) => (
                    <option key={layering} value={layering}>
                      {SOIL_LAYERING_LABELS_FA[layering]}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>
            {selectedMethod === DesignMethod.GALERKIN ? (
              <p className="mt-2 text-xs text-copper-text">
                این انتخاب ذخیره می‌شود، اما اجرای محاسبه با موتور «
                {DESIGN_METHOD_LABELS_FA[selectedMethod]}» هنوز در بک‌اند
                پیاده‌سازی نشده و با خطا مواجه خواهد شد. فعلاً فقط IEEE 80-2000
                و IEEE 80-86 قابل اجرا هستند.
              </p>
            ) : (
              <p className="mt-2 text-xs text-text-faint">
                این کیس با این تنظیمات ذخیره می‌شود و محاسبه با موتور «
                {DESIGN_METHOD_LABELS_FA[selectedMethod]}» اجرا خواهد شد.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="conductorSizing.material"
                label="جنس هادی"
                error={errors.conductorSizing?.material?.message}
                {...register("conductorSizing.material")}
              >
                {Object.values(ConductorMaterial).map((material) => (
                  <option key={material} value={material}>
                    {CONDUCTOR_MATERIAL_LABELS_FA[material]}
                  </option>
                ))}
              </SelectField>

              <FormField
                id="conductorSizing.ambientTempC"
                label="دمای محیط (°C)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.conductorSizing?.ambientTempC?.message}
                {...register("conductorSizing.ambientTempC", {
                  valueAsNumber: true,
                })}
              />
            </div>

            <p
              className="mt-2 font-mono text-xs tabular text-text-muted"
              dir="ltr"
            >
              {sizingPreview
                ? `سطح مقطع حداقل مجاز: ${sizingPreview.areaMm2.toFixed(
                    1
                  )} mm² (${sizingPreview.areaKcmil.toFixed(0)} kcmil)`
                : "برای محاسبهٔ سطح مقطع، جریان و مدت‌زمان خطا را وارد کنید."}
            </p>
            <p className="mt-1 text-xs text-text-faint">
              بر اساس معادلهٔ ذوب هادی IEEE 80-2013 (Eq. 37)؛ فعلاً فقط در
              مرورگر محاسبه و برای این کیس ذخیره می‌شود.
            </p>
          </div>

          <TextAreaField
            id="description"
            label="توضیحات (اختیاری)"
            rows={2}
            error={errors.description?.message}
            {...register("description")}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-text">
              پارامترهای خطا
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="fault.faultCurrent"
                label="جریان اتصال کوتاه (A)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.fault?.faultCurrent?.message}
                {...register("fault.faultCurrent", { valueAsNumber: true })}
              />
              <FormField
                id="fault.faultDuration"
                label="مدت زمان خطا (s)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.fault?.faultDuration?.message}
                {...register("fault.faultDuration", { valueAsNumber: true })}
              />
              <FormField
                id="fault.splitFactor"
                label="ضریب تقسیم جریان (0 تا 1)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.fault?.splitFactor?.message}
                {...register("fault.splitFactor", { valueAsNumber: true })}
              />
              <FormField
                id="fault.decrementFactor"
                label="فاکتور کاهنده (≥ 1) (اختیاری، خودکار)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.fault?.decrementFactor?.message}
                // NOTE: no `valueAsNumber` here. React Hook Form applies
                // `valueAsNumber` before `setValueAs`, so an empty input
                // would become NaN and fail validation. `setValueAs`
                // keeps "empty" as `undefined`, so the key is dropped
                // from the JSON and the backend derives Df itself.
                {...register("fault.decrementFactor", {
                  setValueAs: (v) =>
                    v === "" || v == null ? undefined : Number(v),
                })}
              />
              <FormField
                id="fault.shockDuration"
                label="مدت زمان شوک (s)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.fault?.shockDuration?.message}
                {...register("fault.shockDuration", { valueAsNumber: true })}
              />
              <p className="text-xs text-text-faint sm:col-span-2">
                {hasDecrementOverride
                  ? "مقدار واردشده برای فاکتور کاهنده استفاده می‌شود."
                  : derivedDecrementFactor !== null
                  ? `فاکتور کاهندهٔ خودکار بر اساس مدت زمان خطا: ${derivedDecrementFactor}`
                  : "اگر فاکتور کاهنده را خالی بگذارید، از روی مدت زمان خطا محاسبه می‌شود."}
              </p>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-text">تنظیمات</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="settings.surfaceLayerResistivity"
                label="مقاومت ویژهٔ لایهٔ سطحی (Ω·m)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.settings?.surfaceLayerResistivity?.message}
                {...register("settings.surfaceLayerResistivity", {
                  valueAsNumber: true,
                })}
              />
              <FormField
                id="settings.surfaceLayerThickness"
                label="ضخامت لایهٔ سطحی (m)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.settings?.surfaceLayerThickness?.message}
                {...register("settings.surfaceLayerThickness", {
                  valueAsNumber: true,
                })}
              />
              <FormField
                id="settings.bodyWeight"
                label="وزن بدن (kg)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.settings?.bodyWeight?.message}
                {...register("settings.bodyWeight", { valueAsNumber: true })}
              />
              <FormField
                id="settings.frequency"
                label="فرکانس شبکه (Hz)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.settings?.frequency?.message}
                {...register("settings.frequency", { valueAsNumber: true })}
              />
            </div>
          </fieldset>

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
      )}
    </Modal>
  );
}

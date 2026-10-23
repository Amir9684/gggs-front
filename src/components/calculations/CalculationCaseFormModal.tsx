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
import { useConductorMaterials } from "../../hooks/useConductorMaterials";
import { ConductorSizingPreview } from "./ConductorSizingPreview";
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
  // Soil model fetched (with its layers) to check a two-layer selection;
  // the list endpoint does not return layers.
  const [fetchedSoil, setFetchedSoil] = useState<{
    id: string;
    model: SoilModel | null;
  } | null>(null);
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
      conductor: {
        // No material is pre-selected: like the Windows app, the user has
        // to choose a conductor deliberately.
        material: undefined,
        ambientTemperature: 40,
        allowableTemperature: undefined,
        sizingDuration: undefined,
        crossSectionMm2: undefined,
      },
    },
  });

  // Both IEEE methods have a one-layer/two-layer sub-select.
  const selectedMethod = watch("designMethod.method");
  const watchedSoilLayering = watch("designMethod.soilLayering");
  const watchedSoilModelId = watch("soilModelId");
  const needsTwoLayerSoil =
    selectedMethod !== DesignMethod.GALERKIN &&
    watchedSoilLayering === SoilLayeringMethod.TWO_LAYER;

  useEffect(() => {
    if (!needsTwoLayerSoil || !watchedSoilModelId) return;
    let cancelled = false;
    soilModelsApi
      .getOne(watchedSoilModelId)
      .then((model) => {
        if (!cancelled) setFetchedSoil({ id: watchedSoilModelId, model });
      })
      .catch(() => {
        if (!cancelled) setFetchedSoil({ id: watchedSoilModelId, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, [needsTwoLayerSoil, watchedSoilModelId]);

  // `null` while loading or when the fetch failed (the backend still checks).
  const twoLayerSoilLayers =
    needsTwoLayerSoil &&
    fetchedSoil?.id === watchedSoilModelId &&
    fetchedSoil.model
      ? [...(fetchedSoil.model.layers ?? [])].sort(
          (a, b) => a.layerOrder - b.layerOrder
        )
      : null;
  const twoLayerSoilError =
    twoLayerSoilLayers && twoLayerSoilLayers.length !== 2
      ? `برای خاک دولایه، مدل خاک باید دقیقاً دو لایه داشته باشد (مدل انتخاب‌شده ${twoLayerSoilLayers.length} لایه دارد).`
      : null;

  // Inputs of the live conductor-sizing preview (calculated by the backend).
  const watchedFaultCurrent = watch("fault.faultCurrent");
  const watchedFaultDuration = watch("fault.faultDuration");
  const watchedDecrementFactor = watch("fault.decrementFactor");
  const watchedMaterial = watch("conductor.material");
  const watchedAmbientTemp = watch("conductor.ambientTemperature");
  const watchedAllowableTemp = watch("conductor.allowableTemperature");
  const watchedSizingDuration = watch("conductor.sizingDuration");
  const watchedCrossSection = watch("conductor.crossSectionMm2");

  const {
    materials,
    isLoading: isLoadingMaterials,
    error: materialsError,
    findMaterial,
  } = useConductorMaterials();
  const selectedMaterial = findMaterial(watchedMaterial);

  // Df the backend will use: the typed override when there is one,
  // otherwise the value derived from the fault duration.
  const hasDecrementOverride =
    typeof watchedDecrementFactor === "number" &&
    Number.isFinite(watchedDecrementFactor);
  const derivedDecrementFactor = deriveDecrementFactor(watchedFaultDuration);

  const onSubmit: SubmitHandler<CalculationCaseFormValues> = async (values) => {
    setApiErrors([]);
    if (twoLayerSoilError) {
      setApiErrors([twoLayerSoilError]);
      return;
    }
    try {
      // `decrementFactor` and the optional conductor numbers are left out
      // of the JSON when empty, so the backend applies its defaults (Df from
      // the fault duration, Tm = the material's fusing temperature,
      // tc = the fault duration).
      await calculationCasesApi.create({ projectId, ...values });
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

              {selectedMethod !== DesignMethod.GALERKIN && (
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
            {twoLayerSoilError && (
              <p className="mt-2 text-xs text-danger">{twoLayerSoilError}</p>
            )}
            {twoLayerSoilLayers?.length === 2 && (
              <p className="mt-2 font-mono text-xs text-text-muted" dir="ltr">
                ρ1 = {twoLayerSoilLayers[0].resistivity} Ω·m, h1 ={" "}
                {twoLayerSoilLayers[0].thickness} m, ρ2 ={" "}
                {twoLayerSoilLayers[1].resistivity} Ω·m
              </p>
            )}
            {selectedMethod === DesignMethod.GALERKIN ? (
              <p className="mt-2 text-xs text-text-faint">
                محاسبه با حل‌گر عددی «{DESIGN_METHOD_LABELS_FA[selectedMethod]}»
                اجرا می‌شود. این روش فقط خاک تک‌لایه و شبکهٔ متعامد را
                پشتیبانی می‌کند؛ تنظیمات حل‌گر را بعد از ساخت کیس در صفحهٔ کیس
                تغییر دهید.
              </p>
            ) : (
              <p className="mt-2 text-xs text-text-faint">
                این کیس با این تنظیمات ذخیره می‌شود و محاسبه با موتور «
                {DESIGN_METHOD_LABELS_FA[selectedMethod]}» اجرا خواهد شد.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            {materialsError && <ErrorBanner messages={[materialsError]} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="conductor.material"
                label="جنس هادی"
                disabled={isLoadingMaterials || !!materialsError}
                error={errors.conductor?.material?.message}
                {...register("conductor.material")}
              >
                <option value="">
                  {isLoadingMaterials ? "در حال بارگذاری…" : "انتخاب کنید…"}
                </option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </SelectField>

              <FormField
                id="conductor.ambientTemperature"
                label="دمای محیط (°C)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.conductor?.ambientTemperature?.message}
                {...register("conductor.ambientTemperature", {
                  valueAsNumber: true,
                })}
              />

              <FormField
                id="conductor.allowableTemperature"
                label="دمای مجاز هادی (°C) (اختیاری)"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={
                  selectedMaterial
                    ? `پیش‌فرض: ${selectedMaterial.fusingTemperature}`
                    : "پیش‌فرض: دمای ذوب جنس هادی"
                }
                error={errors.conductor?.allowableTemperature?.message}
                // `valueAsNumber` would turn an empty input into NaN;
                // `setValueAs` keeps "empty" as `undefined` (not sent).
                {...register("conductor.allowableTemperature", {
                  setValueAs: (v) =>
                    v === "" || v == null ? undefined : Number(v),
                })}
              />

              <FormField
                id="conductor.sizingDuration"
                label="مدت زمان عبور جریان tc (s) (اختیاری)"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={
                  typeof watchedFaultDuration === "number" &&
                  Number.isFinite(watchedFaultDuration)
                    ? `پیش‌فرض: مدت زمان خطا (${watchedFaultDuration})`
                    : "پیش‌فرض: مدت زمان خطا"
                }
                error={errors.conductor?.sizingDuration?.message}
                {...register("conductor.sizingDuration", {
                  setValueAs: (v) =>
                    v === "" || v == null ? undefined : Number(v),
                })}
              />

              <FormField
                id="conductor.crossSectionMm2"
                label="سطح مقطع هادی (mm²) (اختیاری)"
                type="number"
                step="any"
                inputMode="decimal"
                error={errors.conductor?.crossSectionMm2?.message}
                {...register("conductor.crossSectionMm2", {
                  setValueAs: (v) =>
                    v === "" || v == null ? undefined : Number(v),
                })}
              />
            </div>

            <ConductorSizingPreview
              material={watchedMaterial}
              faultCurrent={watchedFaultCurrent}
              duration={watchedSizingDuration ?? watchedFaultDuration}
              ambientTemperature={watchedAmbientTemp}
              allowableTemperature={watchedAllowableTemp}
              crossSectionMm2={watchedCrossSection}
            />
            <p className="mt-1 text-xs text-text-faint">
              بر اساس معادلهٔ ذوب هادی IEEE 80 (Eq. 37) و جدول مواد IEEE 80؛ همان
              مقدار همراه کیس ذخیره می‌شود.
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


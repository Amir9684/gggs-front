import { z } from "zod";

import { DesignMethod, SoilLayeringMethod } from "../types/design-method";
import { ConductorMaterial } from "../types/conductor";

const positive = (message: string) => z.number(message).positive(message);

/** Matches the backend's `createCalculationCaseSchema.designMethod` exactly. */
export const designMethodSchema = z
  .object({
    method: z.enum(DesignMethod, "انتخاب روش طراحی الزامی است."),
    soilLayering: z.enum(SoilLayeringMethod).optional(),
  })
  .refine(
    (data) => data.method !== DesignMethod.IEEE_80_2000 || !!data.soilLayering,
    {
      message: "برای روش IEEE 80-2000 انتخاب نوع لایه‌بندی خاک الزامی است.",
      path: ["soilLayering"],
    }
  );

/**
 * Mirrors the `conductor` object inside `createCalculationCaseSchema` on
 * the backend. Optional numbers are left `undefined` (not sent) when the
 * input is empty, so the backend applies its defaults (Tm = the material's
 * fusing temperature, tc = the fault duration).
 */
export const caseConductorSchema = z
  .object({
    material: z.enum(
      ConductorMaterial,
      "هادی انتخاب نشده است. لطفاً جنس هادی را انتخاب کنید.",
    ),
    ambientTemperature: z
      .number("دمای محیط الزامیست")
      .gte(-40, "دمای محیط نامعتبر است.")
      .lte(80, "دمای محیط نامعتبر است."),
    allowableTemperature: z
      .number("دمای مجاز هادی باید عدد باشد.")
      .positive("دمای مجاز هادی باید مثبت باشد.")
      .optional(),
    sizingDuration: z
      .number("مدت زمان عبور جریان باید عدد باشد.")
      .positive("مدت زمان عبور جریان باید مثبت باشد.")
      .optional(),
    crossSectionMm2: z
      .number("سطح مقطع هادی باید عدد باشد.")
      .positive("سطح مقطع هادی باید مثبت باشد.")
      .optional(),
  })
  .refine(
    (data) =>
      data.allowableTemperature === undefined ||
      data.allowableTemperature > data.ambientTemperature,
    {
      message: "دمای مجاز هادی باید بیشتر از دمای محیط باشد.",
      path: ["allowableTemperature"],
    },
  );

/** Mirrors the `fault` object inside `createCalculationCaseSchema` on the backend. */
export const caseFaultSchema = z.object({
  faultCurrent: positive("جریان اتصال کوتاه باید عددی مثبت باشد."),
  faultDuration: positive("مدت زمان خطا باید عددی مثبت باشد."),
  splitFactor: z
    .number("ضریب تقسیم جریان الزامیست")
    .gt(0, "ضریب تقسیم جریان باید بزرگ‌تر از صفر باشد.")
    .lte(1, "ضریب تقسیم جریان باید حداکثر یک باشد."),
  decrementFactor: z
    .number("فاکتور کاهنده الزامیست")
    .gte(1, "فاکتور کاهنده باید حداقل یک باشد.")
    .optional(),
  shockDuration: positive("مدت زمان شوک باید عددی مثبت باشد."),
});

/** Mirrors the `settings` object inside `createCalculationCaseSchema` on the backend. */
export const caseSettingSchema = z.object({
  surfaceLayerResistivity: positive(
    "مقاومت ویژهٔ لایهٔ سطحی باید عددی مثبت باشد."
  ),
  surfaceLayerThickness: z
    .number("ضخامت لایهٔ سطحی الزامیست")
    .min(0, "ضخامت لایهٔ سطحی باید صفر یا بیشتر باشد."),
  bodyWeight: positive("وزن بدن باید عددی مثبت باشد."),
  frequency: positive("فرکانس شبکه باید عددی مثبت باشد."),
});

/** Mirrors `createCalculationCaseSchema` on the backend (minus `projectId`, taken from the route/section context). */
export const calculationCaseSchema = z.object({
  gridId: z.string().trim().min(1, "انتخاب شبکه الزامی است."),
  soilModelId: z.string().trim().min(1, "انتخاب مدل خاک الزامی است."),
  name: z.string().trim().min(1, "نام کیس محاسباتی الزامی است."),
  description: z.string().trim().optional().default(""),
  fault: caseFaultSchema,
  settings: caseSettingSchema,
  designMethod: designMethodSchema,
  conductor: caseConductorSchema,
});

/** Pre-validation shape — what `register`/`defaultValues` work with (numeric fields may be `undefined` before coercion). */
export type CalculationCaseFormInput = z.input<typeof calculationCaseSchema>;

/** Post-validation shape — what `onSubmit` receives, after zod has coerced and checked everything. */
export type CalculationCaseFormValues = z.output<typeof calculationCaseSchema>;

/**
 * Mirrors `updateCalculationCaseSchema` on the backend — a case's
 * grid/soil-model/fault/settings aren't patchable once created (see
 * `UpdateCalculationCaseDto`), so editing only ever touches name/description.
 */
export const calculationCaseRenameSchema = z.object({
  name: z.string().trim().min(1, "نام کیس محاسباتی الزامی است."),
  description: z.string().trim().optional().default(""),
});

export type CalculationCaseRenameInput = z.input<
  typeof calculationCaseRenameSchema
>;
export type CalculationCaseRenameValues = z.output<
  typeof calculationCaseRenameSchema
>;

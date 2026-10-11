import { z } from "zod";

import { DesignMethod, SoilLayeringMethod } from "../types/design-method";
import { ConductorMaterial } from "../types/conductor-material";

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
 * UI-only for now — see the note in `types/conductor-material.ts`. Not
 * part of `CreateCalculationCaseDto` either; `CalculationCaseFormModal`
 * computes the permissible area client-side (`lib/conductor-sizing.ts`)
 * and strips this out of the API payload the same way as `designMethod`.
 */
export const conductorSizingInputSchema = z.object({
  material: z.enum(ConductorMaterial, "انتخاب جنس هادی الزامی است."),
  ambientTempC: z
    .number("دمای محیط الزامیست")
    .gte(-40, "دمای محیط نامعتبر است.")
    .lte(80, "دمای محیط نامعتبر است."),
});

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
  conductorSizing: conductorSizingInputSchema,
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

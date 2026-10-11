import { z } from "zod";

/**
 * Mirrors `soilLayerSchema` on the backend, minus `layerOrder` — the form
 * only lets the user reorder layers by dragging/moving rows, so order is
 * derived from array position at submit time rather than edited directly.
 * `id` is present (and unused on create) so an edit can tell the backend
 * "update this existing layer" vs "this is a new one" per
 * `updateSoilLayerSchema`.
 */
const numberField = (message: string) => z.number(message).positive(message);

export const soilLayerFormSchema = z.object({
  id: z.string().optional(),
  resistivity: numberField("مقاومت ویژه باید عددی مثبت باشد."),
  thickness: numberField("ضخامت لایه باید عددی مثبت باشد."),
});

/** Mirrors `createSoilModelSchema` / `updateSoilModelSchema` on the backend. */
export const soilModelSchema = z.object({
  name: z.string().trim().min(1, "نام مدل خاک الزامی است."),
  surfaceResistivity: numberField("مقاومت ویژهٔ سطحی باید عددی مثبت باشد."),
  layers: z
    .array(soilLayerFormSchema)
    .min(1, "مدل خاک باید حداقل یک لایه داشته باشد."),
});

/** Pre-validation shape — what `register`/`defaultValues` work with (numeric fields may be `undefined` or a string before coercion). */
export type SoilLayerFormInput = z.input<typeof soilLayerFormSchema>;
export type SoilModelFormInput = z.input<typeof soilModelSchema>;

/** Post-validation shape — what `onSubmit` receives, after zod has coerced and checked everything. */
export type SoilLayerFormValues = z.output<typeof soilLayerFormSchema>;
export type SoilModelFormValues = z.output<typeof soilModelSchema>;
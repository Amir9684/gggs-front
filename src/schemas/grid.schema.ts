import { z } from "zod";

const numberField = (message: string) => z.number(message).positive(message);

/** Mirrors `createGridSchema` / `updateGridSchema` on the backend. */
export const gridSchema = z.object({
  name: z.string().trim().min(1, "نام شبکه الزامی است."),
  length: numberField("طول شبکه باید عددی مثبت باشد."),
  width: numberField("عرض شبکه باید عددی مثبت باشد."),
  burialDepth: numberField("عمق دفن باید عددی مثبت باشد."),
});

/** Pre-validation shape — what `register`/`defaultValues` work with (numeric fields may be `undefined`/a string before coercion). */
export type GridFormInput = z.input<typeof gridSchema>;

/** Post-validation shape — what `onSubmit` receives, after zod has coerced and checked everything. */
export type GridFormValues = z.output<typeof gridSchema>;
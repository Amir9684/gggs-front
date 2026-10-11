import { z } from 'zod';

/** Mirrors `createProjectSchema` on the backend. */
export const projectSchema = z.object({
  name: z.string().trim().min(1, 'نام پروژه الزامی است.'),
  description: z.string().trim().optional(),
  substationName: z.string().trim().min(1, 'نام پست الزامی است.'),
  voltageLevel: z.string().trim().min(1, 'سطح ولتاژ الزامی است.'),
  standard: z.string().trim().min(1, 'استاندارد الزامی است.'),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
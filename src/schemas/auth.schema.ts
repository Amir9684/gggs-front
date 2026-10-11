import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است.'),
  password: z.string().min(1, 'رمز عبور الزامی است.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Backend enforces 8–16 chars server-side too (see `createUserSchema`);
 * validating it here just avoids a round trip for the most common mistake.
 */
export const registerSchema = z
  .object({
    username: z.string().min(1, 'نام کاربری الزامی است.'),
    email: z.string().min(1, 'ایمیل الزامی است.').email('ایمیل معتبر نیست.'),
    password: z
      .string()
      .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.')
      .max(16, 'رمز عبور باید حداکثر ۱۶ کاراکتر باشد.'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور الزامی است.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'رمز عبور و تکرار آن یکسان نیستند.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
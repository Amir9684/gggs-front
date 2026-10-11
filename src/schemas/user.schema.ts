import { z } from 'zod';

/** Mirrors `createUserSchema` on the backend. */
export const createUserSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است.'),
  email: z.string().min(1, 'ایمیل الزامی است.').email('ایمیل معتبر نیست.'),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.')
    .max(16, 'رمز عبور باید حداکثر ۱۶ کاراکتر باشد.'),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

/**
 * Same shape, but password is optional: leaving it blank on the edit form
 * means "keep the current password" (the backend only re-hashes when
 * `updateUserDto.password` is truthy — see `UserService.update`).
 */
export const editUserSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است.'),
  email: z.string().min(1, 'ایمیل الزامی است.').email('ایمیل معتبر نیست.'),
  password: z
    .union([
      z.literal(''),
      z
        .string()
        .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.')
        .max(16, 'رمز عبور باید حداکثر ۱۶ کاراکتر باشد.'),
    ])
    .optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
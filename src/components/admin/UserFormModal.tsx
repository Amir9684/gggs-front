import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Modal } from '../Modal';
import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { usersApi } from '../../api/users.api';
import { ApiError } from '../../types/api';
import type { User } from '../../types/user';
import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormValues,
  type EditUserFormValues,
} from '../../schemas/user.schema';
import { useState } from 'react';

interface UserFormModalProps {
  /** Present → edit mode; absent → create mode. */
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const isEdit = !!user;
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues | EditUserFormValues>({
    resolver: zodResolver(isEdit ? editUserSchema : createUserSchema),
    defaultValues: isEdit
      ? { username: user.username, email: user.email, password: '' }
      : { username: '', email: '', password: '' },
  });

  const onSubmit = async (values: CreateUserFormValues | EditUserFormValues) => {
    setApiErrors([]);
    try {
      if (isEdit) {
        const payload = { id: user.id, username: values.username, email: values.email };
        await usersApi.update(user.id, values.password ? { ...payload, password: values.password } : payload);
      } else {
        await usersApi.create(values as CreateUserFormValues);
      }
      onSaved();
    } catch (err) {
      setApiErrors(err instanceof ApiError ? err.messages : ['ذخیرهٔ کاربر ناموفق بود.']);
    }
  };

  return (
    <Modal title={isEdit ? 'ویرایش کاربر' : 'افزودن کاربر'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="username"
          label="نام کاربری"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />

        <FormField
          id="email"
          label="ایمیل"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <FormField
          id="password"
          label={isEdit ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
          type="password"
          autoComplete="new-password"
          placeholder={isEdit ? 'برای عدم تغییر خالی بگذارید' : undefined}
          error={errors.password?.message}
          {...register('password')}
        />

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
            {isSubmitting ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
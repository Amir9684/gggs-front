import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthLayout } from '../../components/auth/AuthLayout';
import { ErrorBanner } from '../../components/auth/ErrorBanner';
import { FormField } from '../../components/auth/FormField';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../types/api';
import { registerSchema, type RegisterFormValues } from '../../schemas/auth.schema';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  // Server-side/API errors (e.g. "username already taken"), distinct from
  // the field-level validation errors react-hook-form tracks in formState.
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiErrors([]);
    try {
      await registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setApiErrors(err instanceof ApiError ? err.messages : ['ثبت‌نام ناموفق بود.']);
    }
  };

  return (
    <AuthLayout
      eyebrow="ایجاد حساب کاربری"
      title="ثبت‌نام"
      subtitle="حساب کاربری جدید با نقش مهندس ایجاد می‌شود؛ تغییر نقش تنها توسط ادمین امکان‌پذیر است."
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link to="/login" className="font-medium text-copper-text hover:text-copper-hover">
            وارد شوید
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="username"
          label="نام کاربری"
          autoComplete="username"
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
          label="رمز عبور"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <FormField
          id="confirmPassword"
          label="تکرار رمز عبور"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'در حال ثبت‌نام…' : 'ایجاد حساب'}
        </button>
      </form>
    </AuthLayout>
  );
}
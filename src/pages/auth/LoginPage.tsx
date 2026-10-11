import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthLayout } from '../../components/auth/AuthLayout';
import { ErrorBanner } from '../../components/auth/ErrorBanner';
import { FormField } from '../../components/auth/FormField';
import { useAuth } from '../../context/useAuth';
import { ApiError } from '../../types/api';
import { loginSchema, type LoginFormValues } from '../../schemas/auth.schema';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Server-side/API errors (e.g. "invalid credentials"), distinct from the
  // field-level validation errors react-hook-form tracks in formState.
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiErrors([]);
    try {
      await login(values);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setApiErrors(err instanceof ApiError ? err.messages : ['ورود ناموفق بود.']);
    }
  };

  return (
    <AuthLayout
      eyebrow="ورود به سامانه"
      title="خوش آمدید"
      subtitle="برای دسترسی به پروژه‌ها و محاسبات، وارد حساب کاربری خود شوید."
      footer={
        <>
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="font-medium text-copper-text hover:text-copper-hover">
            ثبت‌نام کنید
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
          id="password"
          label="رمز عبور"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </AuthLayout>
  );
}
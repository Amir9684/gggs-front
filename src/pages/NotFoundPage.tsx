import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <span className="font-mono text-xs tracking-widest text-text-faint uppercase">خطای ۴۰۴</span>
      <h1 className="text-2xl font-bold text-text">صفحه یافت نشد</h1>
      <p className="max-w-sm text-sm text-text-muted">آدرسی که وارد کرده‌اید وجود ندارد.</p>
      <Link
        to="/"
        className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
      >
        بازگشت به صفحهٔ اصلی
      </Link>
    </div>
  );
}
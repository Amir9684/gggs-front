import { Link } from 'react-router';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <span className="font-mono text-xs tracking-widest text-danger uppercase">خطای ۴۰۳</span>
      <h1 className="text-2xl font-bold text-text">دسترسی غیرمجاز</h1>
      <p className="max-w-sm text-sm text-text-muted">
        نقش کاربری شما اجازهٔ مشاهدهٔ این بخش را نمی‌دهد. در صورت نیاز با ادمین سامانه تماس
        بگیرید.
      </p>
      <Link
        to="/"
        className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-copper hover:text-copper-text"
      >
        بازگشت به صفحهٔ اصلی
      </Link>
    </div>
  );
}
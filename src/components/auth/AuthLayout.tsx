import type { ReactNode } from 'react';
import { GroundingGridArt } from './GroundingGridArt';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <div className="relative hidden overflow-hidden border-e border-border-soft bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <div className="flex items-center gap-2 font-mono text-sm tracking-wide text-copper-text">
            <span className="inline-block h-2 w-2 rounded-full bg-copper" />
            GGGS
          </div>
          <p className="mt-1 text-sm text-text-muted">سامانه طراحی و محاسبه شبکه‌های زمین</p>
        </div>

        <div className="mx-auto my-10 aspect-square w-full max-w-md">
          <GroundingGridArt />
        </div>

        <p className="max-w-sm text-sm leading-7 text-text-muted">
          هر گره در این شبکه یک میله ارت است. وقتی خطایی رخ می‌دهد، جریان از طریق هادی‌های
          مسی به‌صورت توزیع‌شده در کل شبکه پخش می‌شود — دقیقاً همان چیزی که این سامانه محاسبه
          می‌کند.
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 font-mono text-sm tracking-wide text-copper-text lg:hidden">
            <span className="inline-block h-2 w-2 rounded-full bg-copper" />
            GGGS
          </div>

          <span className="font-mono text-xs tracking-widest text-text-faint uppercase">
            {eyebrow}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-text">{title}</h1>
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-sm text-text-muted">{footer}</div>
        </div>
      </div>
    </div>
  );
}
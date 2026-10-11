import type { Pagination as PaginationInfo } from '../types/api';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (pageNumber: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { pageNumber, totalPages, totalCount } = pagination;

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-border-soft pt-4">
      <p className="font-mono text-xs tabular text-text-faint" dir="ltr">
        {totalCount.toLocaleString('en-US')} نتیجه — صفحهٔ {pageNumber.toLocaleString('en-US')} از{' '}
        {Math.max(totalPages, 1).toLocaleString('en-US')}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageNumber <= 1}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-copper hover:text-copper-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted"
        >
          قبلی
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-copper hover:text-copper-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
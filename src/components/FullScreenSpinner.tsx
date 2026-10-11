export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-copper"
        role="status"
        aria-label="در حال بارگذاری"
      />
    </div>
  );
}
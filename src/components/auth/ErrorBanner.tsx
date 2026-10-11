interface ErrorBannerProps {
  messages: string[];
}

export function ErrorBanner({ messages }: ErrorBannerProps) {
  if (messages.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
    >
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="list-inside list-disc space-y-0.5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
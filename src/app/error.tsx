"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <h2 className="text-xl font-bold text-zinc-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-red-600 mb-4 max-w-md text-center font-mono">
        {error.message}
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-400 mb-4">Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
      >
        Try again
      </button>
    </div>
  );
}

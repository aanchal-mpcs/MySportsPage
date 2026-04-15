"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: "2rem" }}>
        <h2>Something went wrong</h2>
        <p style={{ color: "red", fontFamily: "monospace" }}>{error.message}</p>
        {error.digest && <p style={{ color: "#888" }}>Digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}

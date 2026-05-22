"use client";

import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Auth Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4 bg-black">
      <h2 className="text-xl font-semibold text-white">Authentication error</h2>
      <p className="text-sm text-zinc-400">{error.message || "Please try logging in again."}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[#D4AF37] text-black hover:bg-[#c49d2f] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

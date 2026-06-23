"use client";

import { useEffect } from "react";

export default function LoginRedirectPage() {
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    const target = reason ? `/?reason=${encodeURIComponent(reason)}` : "/";
    window.location.replace(target);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
      <p className="text-sm font-semibold">Redirecting to login...</p>
    </main>
  );
}

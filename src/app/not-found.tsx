"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-white">
      <div className="max-w-lg text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">We couldn&apos;t locate that album</h1>
        <p className="mt-4 text-slate-300">
          The QR code might be outdated or the album was removed. Try scanning again or rebuild it from the studio.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
        >
          Return to studio
        </Link>
      </div>
    </div>
  );
}

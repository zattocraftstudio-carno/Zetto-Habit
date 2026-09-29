import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Offline — Habit Tracker',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-xl font-bold mb-2">You are offline</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          নেটওয়ার্ক নেই। আপনার লোকগুলো সেভ থাকবে এবং সংযোগ ফিরলে অটো সিঙ্ক হবে।
        </p>
        <Link
          href="/home"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold min-h-[44px]"
        >
          আবার চেষ্টা করুন
        </Link>
      </div>
    </div>
  );
}

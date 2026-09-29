import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Habit Tracker — Calm & Consistent',
    short_name: 'HabitTracker',
    description:
      'Track daily habits, streaks and progress with an AI habit coach (বাংলা + English).',
    id: '/home',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#FAFAF7',
    theme_color: '#2E7D6B',
    lang: 'bn',
    dir: 'ltr',
    categories: ['productivity', 'lifestyle', 'health'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    // Long-press shortcuts in the Android app menu / iOS quick actions
    shortcuts: [
      {
        name: 'Add Habit',
        short_name: 'Add',
        url: '/add-habit',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Today',
        short_name: 'Today',
        url: '/home',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Dashboard',
        short_name: 'Stats',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}

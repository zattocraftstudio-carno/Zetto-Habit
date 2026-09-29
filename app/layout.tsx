import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { PrefsProvider } from '@/components/PrefsProvider';
import { SplashScreen } from '@/components/SplashScreen';
import { getPreferences } from '@/actions/preferences';

export const metadata: Metadata = {
  title: 'Habit Tracker — Calm & Vector-Native',
  description: 'A calm, data-forward, multi-tenant habit tracker with custom auth and AI habit coaching.',
  manifest: '/manifest.webmanifest',
  applicationName: 'HabitTracker',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HabitTracker',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2E7D6B' },
    { media: '(prefers-color-scheme: dark)', color: '#3DA18B' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefsRes = await getPreferences();
  const initialPrefs = prefsRes.success ? prefsRes.data : null;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased transition-colors duration-200">
        <ThemeProvider>
          <PrefsProvider initialPrefs={initialPrefs}>
            <ToastProvider>
              <SplashScreen />
              {children}
            </ToastProvider>
          </PrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

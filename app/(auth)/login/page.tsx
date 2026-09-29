'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = usePrefs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please fill in both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ username: username.trim(), password });
      if (!res.success) {
        setError(res.error);
      } else {
        toast(`Welcome back, ${res.data.username}!`, 'success');
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            H
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            Habit Tracker
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('auth.loginSub')}
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 text-sm rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] font-medium"
              >
                {error}
              </div>
            )}

            <Input
              label={t('auth.username')}
              type="text"
              autoComplete="username"
              placeholder="e.g. carno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-[var(--color-primary)] hover:underline font-medium"
              >
                {t('auth.forgot')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {t('auth.signin')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
            {t('auth.noAccount')}{' '}
            <Link
              href="/signup"
              className="text-[var(--color-primary)] font-semibold hover:underline"
            >
              {t('auth.signup')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
